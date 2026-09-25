import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './dto/institution.dto';

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInstitutionDto) {
    const existing = await this.prisma.institution.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        'An institution with this name already exists.',
      );
    }

    return this.prisma.institution.create({
      data: dto,
    });
  }

  async findAllForAdmin() {
    return this.prisma.institution.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllForAgents() {
    return this.prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        country: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    return institution;
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    await this.findOne(id);
    return this.prisma.institution.update({
      where: { id },
      data: dto,
    });
  }

  async toggleActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.institution.update({
      where: { id },
      data: { isActive },
    });
  }
}
