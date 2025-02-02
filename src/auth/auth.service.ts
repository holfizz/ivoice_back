import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async createUser(telegram_id: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        telegram_id,
      },
    });

    if (existingUser) {
      return existingUser;
    }

    return this.prisma.user.create({
      data: {
        telegram_id,
        roles: UserRole.USER,
        balance: 10,
      },
    });
  }

  async getUser(telegram_id: string) {
    return this.prisma.user.findUnique({
      where: {
        telegram_id,
      },
    });
  }
}
