import { Test, TestingModule } from '@nestjs/testing';
import { WebmailController } from './webmail.controller';

describe('WebmailController', () => {
  let controller: WebmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebmailController],
    }).compile();

    controller = module.get<WebmailController>(WebmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
