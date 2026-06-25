import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from '../dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async createBranch(dto: CreateBranchDto) {
    const branch = await this.prisma.branch.create({
      data: {
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters || 50,
        openingTime: dto.openingTime,
        closingTime: dto.closingTime,
      },
    });

    return {
      success: true,
      message: 'Branch geofence created successfully.',
      data: branch,
    };
  }

  async getAllBranches() {
    return this.prisma.branch.findMany();
  }
}
