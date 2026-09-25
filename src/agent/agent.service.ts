import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAgentProfileDto, SubmitAgentLeadDto } from './dto/agent.dto';
import { ApplicationStage, LeadSource, LeadStatus } from '@prisma/client';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AgentService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async getProfile(userId: string) {
    let profile = await this.prisma.agentProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      profile = await this.prisma.agentProfile.create({ data: { userId } });
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateAgentProfileDto) {
    return this.prisma.agentProfile.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async getDashboardStats(userId: string) {
    const totalStudents = await this.prisma.lead.count({
      where: { referredById: userId, isArchived: false },
    });

    const targetSchools = await this.prisma.targetSchool.findMany({
      where: { lead: { referredById: userId } },
      select: { agentCommissionAmount: true, commissionStatus: true },
    });

    const earnings = targetSchools.reduce(
      (acc, school) => {
        const amount = school.agentCommissionAmount || 0;
        if (school.commissionStatus === 'CALCULATED') {
          acc.calculated += amount;
        } else if (
          school.commissionStatus === 'APPROVED' ||
          school.commissionStatus === 'PAID'
        ) {
          acc.paid += amount;
        }
        return acc;
      },
      { calculated: 0, paid: 0 },
    );

    return { totalStudents, earnings };
  }

  async submitStudent(agentId: string, dto: SubmitAgentLeadDto) {
    const existing = await this.prisma.lead.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });

    if (existing) {
      throw new ConflictException(
        'A student with this email or phone number already exists.',
      );
    }

    const { targetSchools, ...leadData } = dto;

    const initialTasks = [
      'Contact student directly (social media/referral)',
      'Receive documents after consultation (university, course, tuition)',
    ];

    const newStudent = await this.prisma.lead.create({
      data: {
        ...leadData,
        source: LeadSource.REFERRAL,
        status: LeadStatus.CONVERTED,
        referredById: agentId,

        targetSchools: {
          create:
            targetSchools?.map((school) => ({
              institutionId: school.institutionId || null,
              customInstitutionName: school.customInstitutionName || null,
              status: 'PENDING',
              commissionStatus: 'PENDING_ADMIN_CONFIG',
            })) || [],
        },

        applications: {
          create: {
            stage: ApplicationStage.CONSULTATION_AND_DOCUMENTS,
            tasks: {
              create: initialTasks.map((title) => ({
                title,
                isCompleted: false,
              })),
            },
          },
        },
      },
      include: { targetSchools: true, applications: true },
    });

    if (newStudent.email) {
      await this.emailService.sendDirectStudentWelcomeEmail(
        newStudent.email,
        newStudent.firstName,
        'Ronald Partners Admissions',
      );
    }

    return newStudent;
  }

  async getMyStudents(agentId: string) {
    return this.prisma.lead.findMany({
      where: { referredById: agentId, isArchived: false },
      include: {
        targetSchools: {
          include: { institution: { select: { name: true, country: true } } },
        },
        applications: { select: { stage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
