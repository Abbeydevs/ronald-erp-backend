import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';

export interface CreateMeetingOptions {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
}

export interface MeetingResult {
  meetUrl: string;
  eventId: string;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private calendar: calendar_v3.Calendar;

  constructor() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      this.logger.warn(
        'Google Calendar credentials missing in environment variables.',
      );
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async createGoogleMeet(
    options: CreateMeetingOptions,
  ): Promise<MeetingResult> {
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      let staticMeetLink =
        process.env.STATIC_MEET_LINK ||
        'https://meet.google.com/placeholder-link';
      staticMeetLink = staticMeetLink.replace(/['"]/g, '').trim();

      const event: calendar_v3.Schema$Event = {
        summary: options.summary,
        description: `${options.description}\n\nJoin Google Meet: ${staticMeetLink}`,
        location: staticMeetLink,
        start: {
          dateTime: options.startTime.toISOString(),
        },
        end: {
          dateTime: options.endTime.toISOString(),
        },
      };

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      const eventId = response.data.id;

      if (!eventId) {
        throw new InternalServerErrorException(
          'Google Calendar API did not return an event ID.',
        );
      }

      this.logger.log(
        `Created Google Calendar event ${eventId} using static Meet link`,
      );

      return {
        meetUrl: staticMeetLink,
        eventId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create Google Calendar event: ${message}`,
        error,
      );
      throw new InternalServerErrorException(
        `Google Calendar Integration Failed: ${message}`,
      );
    }
  }
}
