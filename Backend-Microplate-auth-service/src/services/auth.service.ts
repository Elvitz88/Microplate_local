import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PasswordUtil } from '../utils/password.util';
import { TokenUtil } from '../utils/token.util';
import { AuditService } from './audit.service';
import { emailService } from './email.service';
import { InvalidCredentialsError } from '../utils/errors';
import { config } from '../config/config';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User, 
  TokenPayload,
  PasswordResetRequest,
  PasswordResetData,
  DeviceInfo
} from '../types/auth.types';

type SsoProfile = {
  email: string;
  name?: string;
  oid?: string;
  preferredUsername?: string;
  avatarUrl?: string;
};

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService
  ) {}

  
  async register(data: RegisterData, deviceInfo?: DeviceInfo): Promise<{ user: User; message: string }> {
    
    const passwordValidation = PasswordUtil.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      } else {
        throw new Error('USERNAME_ALREADY_EXISTS');
      }
    }

    
    const hashedPassword = await PasswordUtil.hash(data.password);

    
    const userData: any = {
      email: data.email,
      username: data.username,
      password: hashedPassword,
      emailVerified: false
    };

    if (data.firstName !== undefined) {
      userData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      userData.lastName = data.lastName;
    }

    const user = await this.prisma.user.create({
      data: userData,
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    });

    
    await this.auditService.log({
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email, username: user.username },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return {
      user: this.mapUserToResponse(user),
      message: 'User registered successfully.'
    };
  }

  
  async login(credentials: LoginCredentials, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: credentials.username },
          { username: credentials.username }
        ],
        isActive: true
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    
    const isPasswordValid = await PasswordUtil.verify(user.password, credentials.password);
    if (!isPasswordValid) {
      
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        details: { reason: 'Invalid password' },
        ipAddress: deviceInfo?.ipAddress || 'unknown',
        userAgent: deviceInfo?.userAgent || 'unknown'
      });
      throw new InvalidCredentialsError('Invalid username or password');
    }

    return this.issueTokensForUser(user, deviceInfo, 'LOGIN_SUCCESS');
  }

  
  async refreshToken(refreshToken: string, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    
    TokenUtil.verifyRefreshToken(refreshToken);

    
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    
    if (storedToken.reused) {
      
      await this.prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { revokedAt: new Date() }
      });
      throw new Error('TOKEN_REUSE_DETECTED');
    }

    
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { reused: true }
    });

    
    const newTokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: storedToken.user.id,
      email: storedToken.user.email ?? '',
      username: storedToken.user.username,
      roles: storedToken.user.roles.map((ur: any) => ur.role.name),
      jti: TokenUtil.generateTokenFamily(),
      type: 'access' as const
    };

    const newAccessToken = TokenUtil.generateAccessToken(newTokenPayload);
    const newRefreshToken = TokenUtil.generateRefreshToken(newTokenPayload);

    
    const newRefreshTokenData: any = {
      userId: storedToken.user.id,
      token: newRefreshToken,
      family: newTokenPayload.jti,
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
    };

    if (deviceInfo?.userAgent !== undefined) {
      newRefreshTokenData.deviceInfo = deviceInfo.userAgent;
    }

    await this.prisma.refreshToken.create({
      data: newRefreshTokenData
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60, 
      tokenType: 'Bearer',
      user: this.mapUserToResponse(storedToken.user)
    };
  }

  async exchangeSsoCode(code: string, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    const { userId } = TokenUtil.verifySsoExchangeToken(code);

    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.issueTokensForUser(user, deviceInfo, 'SSO_LOGIN_SUCCESS');
  }

  async resolveSsoUser(profile: SsoProfile, deviceInfo?: DeviceInfo): Promise<User> {
    if (config.azureAd.allowedDomains.length > 0) {
      const domain = profile.email.split('@')[1]?.toLowerCase() || '';
      if (!config.azureAd.allowedDomains.includes(domain)) {
        throw new Error('AAD_DOMAIN_NOT_ALLOWED');
      }
    }

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (user && !user.isActive) {
      throw new Error('USER_DISABLED');
    }

    // Update avatar for existing users if a new avatar is available
    if (user && profile.avatarUrl) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: profile.avatarUrl },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });
    }

    if (!user) {
      const baseUsernameSource: string = String(profile.preferredUsername ?? profile.email ?? 'user');
      const baseUsernamePart = baseUsernameSource.split('@')[0] || baseUsernameSource;
      const baseUsername = baseUsernamePart
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');
      const username = await this.generateUniqueUsername(baseUsername || 'user');
      const [firstName, ...rest] = (profile.name || '').split(' ');
      const lastName = rest.length > 0 ? rest.join(' ') : null;

      const createdUser = await this.prisma.user.create({
        data: {
          name: profile.name || username,
          email: profile.email,
          username,
          password: await PasswordUtil.hash(randomUUID()),
          firstName: firstName || null,
          lastName,
          emailVerified: true,
          ...(profile.avatarUrl && { avatarUrl: profile.avatarUrl }),
        },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });
      user = createdUser;

      await this.auditService.log({
        action: 'SSO_USER_CREATED',
        resource: 'User',
        resourceId: createdUser.id,
        details: {
          email: createdUser.email,
          username: createdUser.username,
          provider: 'azure-ad'
        },
        ipAddress: deviceInfo?.ipAddress || 'unknown',
        userAgent: deviceInfo?.userAgent || 'unknown'
      });
    }

    return this.mapUserToResponse(user);
  }

  
  async logout(refreshToken: string, userId?: string): Promise<void> {
    
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() }
    });

    
    if (userId) {
      await this.auditService.log({
        action: 'LOGOUT',
        resource: 'User',
        resourceId: userId,
        details: { reason: 'User logout' }
      });
    }
  }

  
  async requestPasswordReset(data: PasswordResetRequest, deviceInfo?: DeviceInfo): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email, isActive: true }
    });

    if (!user) {
      
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    
    const resetToken = TokenUtil.generatePasswordResetToken(user.id);

    
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ipAddress: deviceInfo?.ipAddress || 'unknown',
        userAgent: deviceInfo?.userAgent || 'unknown'
      }
    });

    // Send password reset email
    const userEmail = user.email!; // Email must exist since we searched by it
    await emailService.sendPasswordResetEmail({
      email: userEmail,
      ...(user.name && { userName: user.name }),
      resetToken,
      expiresInMinutes: 30,
    });

    await this.auditService.log({
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  
  async resetPassword(data: PasswordResetData, deviceInfo?: DeviceInfo): Promise<{ message: string }> {
    
    const { userId } = TokenUtil.verifyPasswordResetToken(data.token);

    
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token: data.token,
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: true
      }
    });

    if (!resetToken) {
      throw new Error('INVALID_OR_EXPIRED_RESET_TOKEN');
    }

    
    const passwordValidation = PasswordUtil.validatePassword(data.newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    
    const hashedPassword = await PasswordUtil.hash(data.newPassword);

    
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    });

    
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() }
    });

    
    await this.auditService.log({
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'User',
      resourceId: userId,
      details: { email: resetToken.user?.email },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return { message: 'Password reset successfully' };
  }

  
  async verifyEmail(_data: any): Promise<{ message: string }> {
    
    return { message: 'Email verification is disabled. Users are automatically verified upon registration.' };
  }

  
  async updateProfile(
    userId: string,
    data: { email?: string; username?: string; fullName?: string; avatarUrl?: string | null }
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: { roles: { include: { role: true } } }
    });
    if (!user) throw new Error('USER_NOT_FOUND');

    const updateData: Record<string, unknown> = {};
    if (data.email !== undefined) updateData['email'] = data.email;
    if (data.username !== undefined) updateData['username'] = data.username;
    if (data.avatarUrl !== undefined) updateData['avatarUrl'] = data.avatarUrl || null;
    if (data.fullName !== undefined) updateData['name'] = data.fullName;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { roles: { include: { role: true } } }
    });
    return this.mapUserToResponse(updated);
  }

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.mapUserToResponse(user);
  }

  
  private mapUserToResponse(user: any): User {
    const fullName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: fullName || undefined,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((ur: any) => ur.role.name) || [],
      avatarUrl: user.avatarUrl || null,
    };
  }

  private async issueTokensForUser(user: any, deviceInfo: DeviceInfo | undefined, auditAction: string): Promise<AuthResponse> {
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles.map((ur: any) => ur.role.name),
      jti: TokenUtil.generateTokenFamily(),
      type: 'access' as const
    };

    const accessToken = TokenUtil.generateAccessToken(tokenPayload);
    const refreshToken = TokenUtil.generateRefreshToken(tokenPayload);

    const refreshTokenData: any = {
      userId: user.id,
      token: refreshToken,
      family: tokenPayload.jti,
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    if (deviceInfo?.userAgent !== undefined) {
      refreshTokenData.deviceInfo = deviceInfo.userAgent;
    }

    await this.prisma.refreshToken.create({
      data: refreshTokenData
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await this.auditService.log({
      action: auditAction,
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email, username: user.username },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      tokenType: 'Bearer',
      user: this.mapUserToResponse(user)
    };
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    let candidate = base || 'user';
    let suffix = 0;
    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }
}
