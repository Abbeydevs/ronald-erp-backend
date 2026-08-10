import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByRole(role: Role) {
    this.logger.log(`Fetching users with role: ${role}`);

    return this.prisma.user.findMany({
      where: {
        role: role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
