import crypto from 'crypto';
import { prisma } from '../../config';
import { hashPassword, comparePassword, generateToken } from '../../utils';
import { Role } from '../../shared';
import { EmailService } from '../email/email.service';

const emailService = new EmailService();

export class AuthService {
  async register(data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('El email ya está registrado');

    const hashedPassword = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: 'GUEST',
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, hotelId: true },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      hotelId: user.hotelId,
    });

    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Credenciales inválidas');

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new Error('Credenciales inválidas');

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      hotelId: user.hotelId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hotelId: user.hotelId,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, hotelId: true, hotel: { select: { id: true, name: true, slug: true } } },
    });
    if (!user) throw new Error('Usuario no encontrado');

    // Include subscription info for HOTEL_ADMIN (current = latest active/trialing/pending)
    if (user.role === 'HOTEL_ADMIN' && user.hotelId) {
      let subscription = await prisma.subscription.findFirst({
        where: {
          hotelId: user.hotelId,
          status: { in: ['TRIALING', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE'] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          trialStartDate: true,
          trialEndDate: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          totalPrice: true,
          paidAmount: true,
          planPrice: {
            select: {
              id: true,
              price: true,
              currency: true,
              intervalCount: true,
              intervalUnit: true,
              plan: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });
      // Fallback to latest subscription if none active
      if (!subscription) {
        subscription = await prisma.subscription.findFirst({
          where: { hotelId: user.hotelId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            trialStartDate: true,
            trialEndDate: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            totalPrice: true,
            paidAmount: true,
            planPrice: {
              select: {
                id: true,
                price: true,
                currency: true,
                intervalCount: true,
                intervalUnit: true,
                plan: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        });
      }
      return { ...user, subscription };
    }

    return user;
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Don't reveal if email exists

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    await emailService.sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      resetToken,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });
    if (!user) throw new Error('Token inválido o expirado');

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Usuario no encontrado');

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new Error('Contraseña actual incorrecta');

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
