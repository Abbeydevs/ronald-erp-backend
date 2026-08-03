import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { Branch } from '@prisma/client';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBranch(dto: CreateBranchDto): Promise<Branch> {
    const existingBranch = await this.prisma.branch.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });

    if (existingBranch) {
      throw new ConflictException(
        `A branch named "${dto.name}" already exists.`,
      );
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters ?? 50,
        openingTime: dto.openingTime ?? '09:00',
        closingTime: dto.closingTime ?? '17:00',
      },
    });

    this.logger.log(`Branch created successfully: ${branch.name}`);
    return branch;
  }

  async findAll(): Promise<Branch[]> {
    const branches = await this.prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
    this.logger.log(`Fetched ${branches.length} branches`);
    return branches;
  }
}
