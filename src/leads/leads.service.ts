import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLeadDto,
  BulkAssignDto,
  FacebookWebhookPayload,
} from './dto/create-lead.dto';
import { LeadStatus, LeadPriority, LeadSource } from '@prisma/client';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private calculatePriority(dto: Partial<CreateLeadDto>): LeadPriority {
    let score = 0;

    if (dto.phone && dto.email) score += 20;
    if (dto.budget) {
      const budgetLower = dto.budget.toLowerCase();
      if (
        budgetLower.includes('high') ||
        budgetLower.includes('20') ||
        budgetLower.includes('30')
      ) {
        score += 40;
      } else {
        score += 20;
      }
    }
    if (dto.countryChoice) score += 20;
    if (dto.courseOfStudy) score += 10;
    if (dto.source === LeadSource.WALK_IN || dto.source === LeadSource.FACEBOOK)
      score += 10;

    // Give a slight bump for internal staff referrals
    if (dto.source === LeadSource.STAFF || dto.source === LeadSource.REFERRAL)
      score += 15;

    if (score >= 60) return LeadPriority.HOT;
    if (score >= 30) return LeadPriority.WARM;
    return LeadPriority.COLD;
  }

  async create(createLeadDto: CreateLeadDto) {
    const existing = await this.findExistingLead(
      createLeadDto.email,
      createLeadDto.phone,
    );

    if (existing) {
      this.logger.warn(`Rejected duplicate lead entry: ${createLeadDto.email}`);
      throw new ConflictException(
        'A lead with this email or phone number already exists in the system.',
      );
    }

    const priority = this.calculatePriority(createLeadDto);

    return this.prisma.lead.create({
      data: {
        ...createLeadDto,
        source: createLeadDto.source || LeadSource.WEBSITE,
        status: LeadStatus.UNASSIGNED,
        priority,
        assignedToId: null,
      },
    });
  }

  private async findExistingLead(email?: string, phone?: string) {
    if (!email && !phone) return null;

    const conditions: Array<{ email?: string; phone?: string }> = [];
    if (email) conditions.push({ email });
    if (phone) conditions.push({ phone });

    return this.prisma.lead.findFirst({
      where: { OR: conditions },
    });
  }

  async getAllLeads() {
    return this.prisma.lead.findMany({
      where: { studentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { name: true } },
        referredBy: { select: { name: true } },
      },
    });
  }

  async getUnassignedPool() {
    return this.prisma.lead.findMany({
      where: { status: LeadStatus.UNASSIGNED, studentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        referredBy: { select: { name: true } },
      },
    });
  }

  async getMyLeads(userId: string) {
    return this.prisma.lead.findMany({
      where: { assignedToId: userId, studentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        referredBy: { select: { name: true } },
      },
    });
  }

  async bulkAssign(dto: BulkAssignDto) {
    const result = await this.prisma.lead.updateMany({
      where: { id: { in: dto.leadIds } },
      data: {
        assignedToId: dto.counsellorId,
        status: LeadStatus.ASSIGNED,
      },
    });

    this.logger.log(
      `Assigned ${result.count} leads to counsellor ${dto.counsellorId}`,
    );
    return { success: true, count: result.count };
  }

  async processFacebookLead(payload: FacebookWebhookPayload) {
    this.logger.log('Processing Facebook webhook event...');

    try {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      const leadgenId = changes?.leadgen_id;

      if (!leadgenId) {
        this.logger.warn(
          'Received webhook payload, but no leadgen_id was found.',
        );
        return { received: true };
      }

      const fbToken = process.env.FACEBOOK_GRAPH_API_TOKEN;
      if (!fbToken) {
        this.logger.error(
          'Missing FACEBOOK_GRAPH_API_TOKEN in environment variables.',
        );
        return { received: true };
      }

      const fbResponse = await fetch(
        `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${fbToken}`,
      );

      const fbData = (await fbResponse.json()) as {
        error?: { message: string };
        field_data?: Array<{ name: string; values: string[] }>;
      };

      if (fbData.error) {
        this.logger.error(`Facebook API error: ${fbData.error.message}`);
        return { received: true };
      }

      let email = '';
      let phone = '';
      let fullName = 'Meta lead';
      let countryChoice = '';
      let courseOfStudy = '';

      if (fbData.field_data && Array.isArray(fbData.field_data)) {
        for (const field of fbData.field_data) {
          const value = field.values[0] || '';
          if (field.name === 'email') email = value;
          if (field.name === 'phone_number') phone = value;
          if (field.name === 'full_name') fullName = value;
          if (field.name.includes('country')) countryChoice = value;
          if (field.name.includes('course') || field.name.includes('program'))
            courseOfStudy = value;
        }
      }

      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Lead';

      await this.create({
        firstName,
        lastName,
        email,
        phone,
        countryChoice,
        courseOfStudy,
        source: LeadSource.FACEBOOK,
      });

      this.logger.log(
        `Successfully ingested and classified Facebook lead for ${email || fullName}`,
      );
      return { received: true };
    } catch (error) {
      this.logger.error('Critical failure processing Facebook lead', error);
      return { received: true };
    }
  }

  async getLeadById(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { name: true } },
        referredBy: { select: { name: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }
}
