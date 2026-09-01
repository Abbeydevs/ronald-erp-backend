import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import * as express from 'express';

interface RequestWithUser extends express.Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@Controller('reminders')
@UseGuards(AuthGuard('jwt'))
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body() createReminderDto: CreateReminderDto,
  ) {
    return this.remindersService.create(req.user.id, createReminderDto);
  }

  @Get()
  getMyReminders(@Req() req: RequestWithUser) {
    return this.remindersService.getMyReminders(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.remindersService.markAsRead(id, req.user.id);
  }
}
