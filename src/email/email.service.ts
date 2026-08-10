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
        from: 'Ronald Partners <onboarding@thesoftwarehub.tech>',
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
        from: 'Ronald Partners <onboarding@thesoftwarehub.tech>',
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
}
