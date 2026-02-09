import { PrismaClient, Otp, OtpType } from '@prisma/client';
import { logger } from '../utils/logger';
import { TokenUtil } from '../utils/token.util';
import crypto from 'crypto';

interface GenerateOtpParams {
  userIdentifier: string; // Email or phone number
  otpType: OtpType;
  userId?: string;
}

interface VerifyOtpParams {
  userIdentifier: string;
  otpValue: string;
  otpType: OtpType;
}

/**
 * OTP Service
 * Handles OTP generation, verification, and cleanup (matching Authentication-service-be pattern)
 */
export class OtpService {
  private otpLength: number;
  private otpExpiryMinutes: number;

  constructor(private prisma: PrismaClient) {
    this.otpLength = parseInt(process.env['OTP_LENGTH'] || '6');
    this.otpExpiryMinutes = parseInt(process.env['OTP_EXPIRY_MINUTES'] || '10');
  }

  /**
   * Generate OTP code
   * Matches: Authentication-service-be/src/services/otpService.ts
   */
  private generateOtpValue(): string {
    const digits = '0123456789';
    let otpValue = '';

    for (let i = 0; i < this.otpLength; i++) {
      otpValue += digits[crypto.randomInt(0, digits.length)];
    }

    return otpValue;
  }

  /**
   * Generate and save OTP
   * Matches: Authentication-service-be/src/services/otpService.ts
   */
  async generateOtp(params: GenerateOtpParams): Promise<{
    otp: Otp;
    otpValue: string;
  }> {
    try {
      // Invalidate any existing OTPs for this identifier and type
      await this.prisma.otp.updateMany({
        where: {
          userIdentifier: params.userIdentifier,
          otpType: params.otpType,
          verified: false,
        },
        data: {
          verified: true, // Mark as used to prevent reuse
        },
      });

      // Generate OTP value
      const otpValue = this.generateOtpValue();

      // Generate JWT token for OTP session
      const token = TokenUtil.generateOtpToken({
        userIdentifier: params.userIdentifier,
        otpType: params.otpType,
      });

      // Create OTP record
      const otp = await this.prisma.otp.create({
        data: {
          userIdentifier: params.userIdentifier,
          otpType: params.otpType,
          userId: params.userId || null,
          value: otpValue,
          token,
          issueTime: new Date(),
          verified: false,
        },
      });

      logger.info('OTP generated', {
        userIdentifier: params.userIdentifier,
        otpType: params.otpType,
        otpId: otp.id,
        expiresIn: `${this.otpExpiryMinutes} minutes`,
      });

      return { otp, otpValue };
    } catch (error) {
      logger.error('Error generating OTP', { error, params });
      throw error;
    }
  }

  /**
   * Verify OTP
   * Matches: Authentication-service-be/src/services/otpService.ts
   */
  async verifyOtp(params: VerifyOtpParams): Promise<{
    isValid: boolean;
    otp?: Otp;
    userId?: string;
  }> {
    try {
      // Find OTP record
      const otp = await this.prisma.otp.findFirst({
        where: {
          userIdentifier: params.userIdentifier,
          otpType: params.otpType,
          value: params.otpValue,
          verified: false,
        },
        orderBy: {
          issueTime: 'desc',
        },
      });

      if (!otp) {
        logger.warn('OTP not found or already used', {
          userIdentifier: params.userIdentifier,
          otpType: params.otpType,
        });
        return { isValid: false };
      }

      // Check if OTP is expired
      const now = new Date();
      const expiryTime = new Date(
        otp.issueTime.getTime() + this.otpExpiryMinutes * 60 * 1000
      );

      if (now > expiryTime) {
        logger.warn('OTP expired', {
          userIdentifier: params.userIdentifier,
          otpType: params.otpType,
          otpId: otp.id,
          issuedAt: otp.issueTime,
          expiresAt: expiryTime,
        });
        return { isValid: false };
      }

      // Mark OTP as verified
      const verifiedOtp = await this.prisma.otp.update({
        where: { id: otp.id },
        data: { verified: true },
      });

      logger.info('OTP verified successfully', {
        userIdentifier: params.userIdentifier,
        otpType: params.otpType,
        otpId: otp.id,
      });

      return {
        isValid: true,
        otp: verifiedOtp,
        ...(verifiedOtp.userId ? { userId: verifiedOtp.userId } : {}),
      };
    } catch (error) {
      logger.error('Error verifying OTP', { error, params });
      throw error;
    }
  }

  /**
   * Resend OTP
   */
  async resendOtp(params: GenerateOtpParams): Promise<{
    otp: Otp;
    otpValue: string;
  }> {
    // Check if user hasn't requested too many OTPs recently
    const recentOtps = await this.prisma.otp.count({
      where: {
        userIdentifier: params.userIdentifier,
        otpType: params.otpType,
        issueTime: {
          gte: new Date(Date.now() - 60 * 1000), // Last minute
        },
      },
    });

    if (recentOtps >= 3) {
      throw new Error('Too many OTP requests. Please wait before trying again.');
    }

    return this.generateOtp(params);
  }

  /**
   * Clean up expired OTPs
   * Matches: Authentication-service-be/src/backgroundJobs/deleteOTP.ts
   */
  async cleanupExpiredOtps(): Promise<number> {
    try {
      const expiryDate = new Date(
        Date.now() - this.otpExpiryMinutes * 60 * 1000
      );

      const result = await this.prisma.otp.deleteMany({
        where: {
          issueTime: {
            lt: expiryDate,
          },
        },
      });

      logger.info('Cleaned up expired OTPs', {
        count: result.count,
        olderThan: expiryDate,
      });

      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs', { error });
      throw error;
    }
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getOtpStats(): Promise<{
    totalActive: number;
    totalVerified: number;
    byType: Record<string, number>;
  }> {
    const [totalActive, totalVerified, byType] = await Promise.all([
      this.prisma.otp.count({ where: { verified: false } }),
      this.prisma.otp.count({ where: { verified: true } }),
      this.prisma.otp.groupBy({
        by: ['otpType'],
        _count: true,
        where: { verified: false },
      }),
    ]);

    const byTypeMap: Record<string, number> = {};
    byType.forEach(
      (item: { otpType: OtpType; _count: { _all: number } | number }) => {
        byTypeMap[item.otpType] =
          typeof item._count === 'number' ? item._count : item._count._all;
      }
    );

    return {
      totalActive,
      totalVerified,
      byType: byTypeMap,
    };
  }
}
