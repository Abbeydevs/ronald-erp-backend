import { Test, TestingModule } from '@nestjs/testing';
import { AdminAttendanceController } from './admin-attendance.controller';

describe('AdminAttendanceController', () => {
  let controller: AdminAttendanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAttendanceController],
    }).compile();

    controller = module.get<AdminAttendanceController>(AdminAttendanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
