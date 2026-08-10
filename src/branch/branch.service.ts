import {
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { Branch } from '@prisma/client';
import { UpdateBranchDto } from './dto/update-branch.dto';

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

  async updateBranch(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const existingBranch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      throw new NotFoundException(`Branch with ID ${id} not found.`);
    }

    if (
      dto.name &&
      dto.name.toLowerCase() !== existingBranch.name.toLowerCase()
    ) {
      const nameConflict = await this.prisma.branch.findFirst({
        where: { name: { equals: dto.name, mode: 'insensitive' } },
      });

      if (nameConflict) {
        throw new ConflictException(
          `A branch named "${dto.name}" already exists.`,
        );
      }
    }

    const updatedBranch = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.latitude && { latitude: dto.latitude }),
        ...(dto.longitude && { longitude: dto.longitude }),
        ...(dto.radiusMeters && { radiusMeters: dto.radiusMeters }),
        ...(dto.openingTime && { openingTime: dto.openingTime }),
        ...(dto.closingTime && { closingTime: dto.closingTime }),
      },
    });

    this.logger.log(`Branch updated successfully: ${updatedBranch.name}`);
    return updatedBranch;
  }

  async deleteBranch(id: string): Promise<void> {
    const existingBranch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      throw new NotFoundException(`Branch with ID ${id} not found.`);
    }

    await this.prisma.branch.delete({
      where: { id },
    });

    this.logger.log(`Branch deleted successfully: ${existingBranch.name}`);
  }
}
