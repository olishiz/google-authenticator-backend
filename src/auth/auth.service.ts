import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

// Define an interface for the secret returned by speakeasy
interface SpeakeasySecret {
  ascii: string;
  hex: string;
  base32: string;
  otpauth_url: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  // Register a user: generate a TOTP secret, store the user, and return the QR code URL.
  async register(email: string): Promise<{ user: any; qrCodeDataURL: string }> {
    // Generate a TOTP secret with an explicit type assertion
    const secretResult = speakeasy.generateSecret({ name: `MyApp (${email})` });
    const secret = secretResult as SpeakeasySecret;

    // Save the user to the database with totpSecret stored in base32
    const user = await this.prisma.user.create({
      data: {
        email,
        totpSecret: secret.base32,
      },
    });

    // Generate the otpauth URL and convert it to a QR code data URL.
    const otpauthUrl: string = secret.otpauth_url;
    const qrCodeDataURL: string = (await qrcode.toDataURL(
      otpauthUrl,
    )) as string;

    return { user, qrCodeDataURL };
  }

  // Verify the provided TOTP token against the stored secret.
  async verifyCode(userId: number, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      throw new BadRequestException('User not found or TOTP secret not set');
    }

    const isValid: boolean = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow a small time drift.
    }) as boolean;

    return isValid;
  }

  async getAllUsers() {
    return this.prisma.user.findMany();
  }
}
