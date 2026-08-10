import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLeadDto,
  BulkAssignDto,
  FacebookWebhookPayload,
} from './dto/create-lead.dto';
import { LeadStatus, LeadPriority } from '@prisma/client';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createLeadDto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        ...createLeadDto,
        status: LeadStatus.UNASSIGNED,
        priority: LeadPriority.WARM,
      },
    });
  }

  async getAllLeads() {
    return this.prisma.lead.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        assignedTo: {
          select: { name: true },
        },
      },
    });
  }

  async getUnassignedPool() {
    return this.prisma.lead.findMany({
      where: {
        status: LeadStatus.UNASSIGNED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyLeads(userId: string) {
    return this.prisma.lead.findMany({
      where: {
        assignedToId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async bulkAssign(dto: BulkAssignDto) {
    const result = await this.prisma.lead.updateMany({
      where: {
        id: { in: dto.leadIds },
      },
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

      if (fbData.field_data && Array.isArray(fbData.field_data)) {
        for (const field of fbData.field_data) {
          const value = field.values[0] || '';
          if (field.name === 'email') email = value;
          if (field.name === 'phone_number') phone = value;
          if (field.name === 'full_name') fullName = value;
        }
      }

      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Lead';

      const newLead = await this.prisma.lead.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          source: 'FACEBOOK',
          status: 'UNASSIGNED',
          priority: 'HOT',
        },
      });

      this.logger.log(`Successfully ingested Facebook lead: ${newLead.id}`);
      return { received: true };
    } catch (error) {
      this.logger.error('Critical failure processing Facebook lead', error);
      return { received: true };
    }
  }
}
