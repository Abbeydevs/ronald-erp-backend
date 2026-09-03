import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || '');
  }

  async sendStaffInvite(
    email: string,
    role: string,
    inviteUrl: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Ronald Partners <onboarding@ronaldpartners.com>',
        to: email,
        subject: 'Secure Access Provisioned: Ronald Partners Portal',
        html: `
          <div style="font-family: monospace; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0fa3b1;">Welcome to Ronald Partners</h2>
            <p>You have been granted access to the staff portal as a <strong>${role}</strong>.</p>
            <p>Please click the secure link below to set up your credentials. This link will expire in 24 hours.</p>
            <a href="${inviteUrl}" style="display:inline-block; margin-top: 10px; padding:10px 20px; background-color:#0fa3b1; color:#fff; text-decoration:none; border-radius:5px; font-weight: bold;">Activate Account</a>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend API Error: ${error.message}`, error);
        return false;
      }

      if (data) {
        this.logger.log(
          `Invite email successfully dispatched to ${email}. ID: ${data.id}`,
        );
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Network or unexpected error dispatching to ${email}`,
        error,
      );
      return false;
    }
  }

  async sendIdleAlertEmail(name: string, email: string): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Ronald Partners <onboarding@ronaldpartners.com>',
        to: 'ayomidbankole@gmail.com',
        subject: `Security Alert: Idle Session Locked - ${name}`,
        html: `
          <div style="font-family: monospace; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d9534f;">Idle Session Locked</h2>
            <p><strong>Staff Member:</strong> ${name} (${email})</p>
            <p><strong>Reason:</strong> Exceeded 60 minutes of inactivity.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}</p>
            <p>The system has automatically locked their dashboard to protect sensitive company data.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend API Error: ${error.message}`, error);
        return false;
      }

      if (data) {
        this.logger.log(
          `Idle alert email dispatched for ${name}. ID: ${data.id}`,
        );
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Network error dispatching idle alert for ${name}`,
        error,
      );
      return false;
    }
  }

  async sendStudentEmail(
    toEmail: string,
    subject: string,
    bodyHtml: string,
    replyTo?: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Ronald Partners <onboarding@ronaldpartners.com>',
        to: toEmail,
        replyTo: replyTo,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #0fa3b1; margin-bottom: 16px;">Ronald Partners Communications</h3>
            <div style="color: #334155; line-height: 1.6;">
              ${bodyHtml}
            </div>
            <hr style="margin-top: 24px; border: none; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8;">Ronald Partners ERP Portal</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(
          `Resend Student Email Error: ${error.message}`,
          error,
        );
        return false;
      }

      if (data) {
        this.logger.log(`Student email sent to ${toEmail}. ID: ${data.id}`);
      }

      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to dispatch student email to ${toEmail}: ${msg}`,
      );
      return false;
    }
  }

  async sendMeetingInviteEmail(
    toEmail: string,
    studentName: string,
    meetUrl: string,
    scheduledAt: Date,
  ): Promise<boolean> {
    try {
      const formattedDate = scheduledAt.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Africa/Lagos',
      });

      const { data, error } = await this.resend.emails.send({
        from: 'Ronald Partners <onboarding@ronaldpartners.com>',
        to: toEmail,
        subject: `Scheduled Consultation Invite - Ronald Partners`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0fa3b1; margin-top: 0;">Consultation Scheduled</h2>
            <p>Dear <strong>${studentName}</strong>,</p>
            <p>Your online consultation has been scheduled for:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #0fa3b1; margin: 16px 0; font-weight: bold;">
              📅 ${formattedDate} (WAT)
            </div>
            <p>Please click the button below to join the Google Meet session at the scheduled time:</p>
            <a href="${meetUrl}" style="display:inline-block; margin: 16px 0; padding: 12px 24px; background-color: #0fa3b1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Join Google Meet
            </a>
            <p style="font-size: 13px; color: #64748b;">Or copy this link into your browser: <br/><a href="${meetUrl}">${meetUrl}</a></p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(
          `Resend Meeting Invite Error: ${error.message}`,
          error,
        );
        return false;
      }

      if (data) {
        this.logger.log(
          `Meeting invite email sent to ${toEmail}. ID: ${data.id}`,
        );
      }

      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send meeting invite to ${toEmail}: ${msg}`);
      return false;
    }
  }

  async sendStudentPortalInvite(
    email: string,
    studentName: string,
    inviteUrl: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Ronald Partners Admissions <onboarding@ronaldpartners.com>',
        to: email,
        subject: 'Welcome to Ronald Partners! Activate Your Student Portal',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0fa3b1; margin-top: 0;">Welcome, ${studentName}!</h2>
            <p>Your dedicated application portal at Ronald Partners is ready.</p>
            <p>This secure portal is where you will upload your documents, track your university applications, and manage your visa process.</p>
            <p>Click the button below to activate your account and set your private password. This link expires in 24 hours.</p>
            <a href="${inviteUrl}" style="display:inline-block; margin: 16px 0; padding: 12px 24px; background-color: #0fa3b1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Activate Student Portal
            </a>
            <p style="font-size: 13px; color: #64748b;">Or copy this link into your browser: <br/><a href="${inviteUrl}">${inviteUrl}</a></p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(
          `Resend Student Invite Error: ${error.message}`,
          error,
        );
        return false;
      }

      this.logger.log(
        `Student portal invite dispatched to ${email}. ID: ${data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to dispatch student portal invite to ${email}`,
        error,
      );
      return false;
    }
  }

  async sendReminderEmail(
    staffName: string,
    email: string,
    reminderTitle: string,
    studentName: string,
    targetStage?: string,
  ): Promise<boolean> {
    try {
      const stageHtml = targetStage
        ? `<p style="color: #64748b; font-size: 13px; margin-top: 4px;"><strong>Target Stage:</strong> ${targetStage.replace(/_/g, ' ')}</p>`
        : '';

      const { error } = await this.resend.emails.send({
        from: 'Ronald Partners CRM <onboarding@ronaldpartners.com>',
        to: email,
        subject: `Reminder: ${reminderTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0fa3b1; margin-top: 0;">Task Reminder</h2>
            <p>Hi <strong>${staffName}</strong>,</p>
            <p>This is your scheduled reminder:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #0fa3b1; margin: 16px 0; font-size: 16px;">
              <strong>${reminderTitle}</strong><br/>
              <span style="color: #64748b; font-size: 14px;">Student: ${studentName}</span>
              ${stageHtml}
            </div>
            <p>Please log in to the Ronald Partners CRM to action this task.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend Reminder Error: ${error.message}`, error);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to dispatch reminder to ${email}`, error);
      return false;
    }
  }
}
