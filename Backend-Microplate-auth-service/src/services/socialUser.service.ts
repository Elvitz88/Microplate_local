import { PrismaClient, User, SocialUser } from '@prisma/client';
import { logger } from '../utils/logger';
import { PasswordUtil } from '../utils/password.util';
import { TokenUtil } from '../utils/token.util';

interface SocialUserDetails {
  socialId: string;
  socialAccountType: 'google' | 'facebook' | 'aad';
  email?: string;
  name: string;
  mobileNumber?: string;
  avatarUrl?: string;
}

interface SocialLoginResult {
  user: User;
  socialUser: SocialUser;
  isNewUser: boolean;
  token: string;
  refreshToken: string;
}

/**
 * SocialUser Service
 * Handles social login user management (matching Authentication-service-be pattern)
 */
export class SocialUserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find or create social user
   * Matches: Authentication-service-be/src/services/socialUserService.ts
   */
  async socialUserDetails(
    socialDetails: SocialUserDetails
  ): Promise<{ userId: string; isNewUser: boolean }> {
    try {
      // Check if social account already exists
      const existingSocialUser = await this.prisma.socialUser.findUnique({
        where: {
          socialId_socialAccountType: {
            socialId: socialDetails.socialId,
            socialAccountType: socialDetails.socialAccountType,
          },
        },
        include: {
          user: true,
        },
      });

      if (existingSocialUser) {
        logger.info('Existing social user found', {
          socialId: socialDetails.socialId,
          type: socialDetails.socialAccountType,
          userId: existingSocialUser.userId,
        });
        if (socialDetails.avatarUrl) {
          await this.prisma.user.update({
            where: { id: existingSocialUser.userId },
            data: { avatarUrl: socialDetails.avatarUrl },
          });
        }
        return {
          userId: existingSocialUser.userId,
          isNewUser: false,
        };
      }

      // Check if user with same email exists
      let user: User | null = null;
      if (socialDetails.email) {
        user = await this.prisma.user.findUnique({
          where: { email: socialDetails.email },
        });
      }

      // Create new user if doesn't exist
      if (!user) {
        user = await this.registerSocialUser(socialDetails);
        logger.info('New user registered via social login', {
          userId: user.id,
          email: user.email,
          type: socialDetails.socialAccountType,
        });
      }

      // Link social account to user
      await this.prisma.socialUser.create({
        data: {
          userId: user.id,
          socialId: socialDetails.socialId,
          socialAccountType: socialDetails.socialAccountType,
        },
      });

      logger.info('Social account linked to user', {
        userId: user.id,
        socialId: socialDetails.socialId,
        type: socialDetails.socialAccountType,
      });

      return {
        userId: user.id,
        isNewUser: !existingSocialUser,
      };
    } catch (error) {
      logger.error('Error in socialUserDetails', { error });
      throw error;
    }
  }

  /**
   * Register new user from social login
   * Matches: Authentication-service-be/src/services/socialUserService.ts
   */
  private async registerSocialUser(socialDetails: SocialUserDetails): Promise<User> {
    // Generate random password for social users
    const randomPassword = await PasswordUtil.hash(
      Math.random().toString(36).substring(2, 15)
    );

    // Generate unique username from email or social ID
    const fallbackUsername = `user_${socialDetails.socialId.substring(0, 8)}`;
    const baseUsername = socialDetails.email
      ? socialDetails.email.split('@')[0] || fallbackUsername
      : fallbackUsername;

    let username = baseUsername;
    let counter = 1;

    // Ensure username is unique
    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const user = await this.prisma.user.create({
      data: {
        name: socialDetails.name,
        username,
        password: randomPassword,
        verified: true, // Social users are pre-verified
        verifiedEmail: !!socialDetails.email,
        emailVerified: !!socialDetails.email,
        forceChangePassword: false, // No password change needed for social users
        ...(socialDetails.email ? { email: socialDetails.email } : {}),
        ...(socialDetails.mobileNumber ? { mobileNumber: socialDetails.mobileNumber } : {}),
        ...(socialDetails.avatarUrl ? { avatarUrl: socialDetails.avatarUrl } : {}),
      },
    });

    return user;
  }

  /**
   * Complete social login flow
   * Matches: Authentication-service-be/src/services/socialUserService.ts
   */
  async socialLoginService(
    socialDetails: SocialUserDetails
  ): Promise<SocialLoginResult> {
    try {
      // Get or create user
      const { userId, isNewUser } = await this.socialUserDetails(socialDetails);

      // Get full user details
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          socialUsers: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      // Check if user is active
      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Generate tokens
      const roles = user.roles.map((userRole) => userRole.role.name);
      const accessPayload = {
        sub: user.id,
        email: user.email ?? '',
        username: user.username,
        roles,
      };
      const refreshPayload = {
        ...accessPayload,
        jti: TokenUtil.generateTokenFamily(),
      };

      const token = TokenUtil.generateAccessToken(accessPayload);
      const refreshToken = TokenUtil.generateRefreshToken(refreshPayload);

      // Update user tokens and last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          token,
          refreshToken,
          lastLoginAt: new Date(),
          failedLoginAttempt: 0, // Reset failed attempts on successful login
          failedLoginwaitTime: null,
        },
      });

      // Get social user record
      const socialUser = await this.prisma.socialUser.findUniqueOrThrow({
        where: {
          socialId_socialAccountType: {
            socialId: socialDetails.socialId,
            socialAccountType: socialDetails.socialAccountType,
          },
        },
      });

      logger.info('Social login successful', {
        userId: user.id,
        email: user.email,
        type: socialDetails.socialAccountType,
        isNewUser,
      });

      return {
        user,
        socialUser,
        isNewUser,
        token,
        refreshToken,
      };
    } catch (error) {
      logger.error('Error in socialLoginService', { error });
      throw error;
    }
  }

  /**
   * Get social accounts for user
   */
  async getUserSocialAccounts(userId: string): Promise<SocialUser[]> {
    return this.prisma.socialUser.findMany({
      where: { userId },
    });
  }

  /**
   * Unlink social account
   */
  async unlinkSocialAccount(
    userId: string,
    socialAccountType: string
  ): Promise<void> {
    const socialUser = await this.prisma.socialUser.findFirst({
      where: {
        userId,
        socialAccountType,
      },
    });

    if (!socialUser) {
      throw new Error('Social account not found');
    }

    // Check if user has password (prevent lockout)
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        socialUsers: true,
      },
    });

    if (!user.password && user.socialUsers.length === 1) {
      throw new Error(
        'Cannot unlink last social account without password. Please set a password first.'
      );
    }

    await this.prisma.socialUser.delete({
      where: { id: socialUser.id },
    });

    logger.info('Social account unlinked', {
      userId,
      type: socialAccountType,
    });
  }
}
