import { Test, TestingModule } from '@nestjs/testing';
import { WebmailService } from './webmail.service';

describe('WebmailService', () => {
  let service: WebmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebmailService],
    }).compile();

    service = module.get<WebmailService>(WebmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
