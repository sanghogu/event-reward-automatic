import { Test, TestingModule } from '@nestjs/testing';
import { RewardClaimService } from './reward-claim.service';

describe('RewardClaimService', () => {
  let service: RewardClaimService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RewardClaimService],
    }).compile();

    service = module.get<RewardClaimService>(RewardClaimService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
