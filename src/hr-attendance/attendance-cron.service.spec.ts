import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceCronService } from './attendance-cron.service';

describe('AttendanceCronService', () => {
  let service: AttendanceCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceCronService],
    }).compile();

    service = module.get<AttendanceCronService>(AttendanceCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
