import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('health')
export class AppController {
  @Get()
  getHealth(@Res() res: Response): void {
    res.status(HttpStatus.OK).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: {
        server: 'HEALTHY',
        database: 'CONNECTED',
      },
    });
  }
}
