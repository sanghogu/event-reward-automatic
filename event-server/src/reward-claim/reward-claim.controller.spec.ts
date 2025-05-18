import { Test, TestingModule } from '@nestjs/testing';
import { RewardClaimController } from './reward-claim.controller';

describe('RewardClaimController', () => {
  let controller: RewardClaimController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardClaimController],
    }).compile();

    controller = module.get<RewardClaimController>(RewardClaimController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
