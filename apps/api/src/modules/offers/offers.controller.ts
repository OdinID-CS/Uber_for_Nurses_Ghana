import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { MemoryStore } from '../../domain/store';

@Controller('v1/offers')
export class OffersController {
  constructor(@Inject(MemoryStore) private readonly store: MemoryStore) {}

  @Post(':offerId/accept')
  @HttpCode(HttpStatus.OK)
  acceptOffer(
    @Param('offerId') offerId: string,
    @Headers('x-nurse-id') nurseHeader: string,
    @Headers('idempotency-key') idempotencyHeader: string,
    @Body() body: { idempotencyKey?: string },
  ) {
    const nurseId = nurseHeader || 'nurse-florence-01';
    const key = body?.idempotencyKey || idempotencyHeader;
    return this.store.acceptOffer(offerId, nurseId, key);
  }

  @Post(':offerId/decline')
  @HttpCode(HttpStatus.OK)
  declineOffer(
    @Param('offerId') offerId: string,
    @Headers('x-nurse-id') nurseHeader: string,
    @Body() body: { reasonCode?: string },
  ) {
    const nurseId = nurseHeader || 'nurse-florence-01';
    return this.store.declineOffer(offerId, nurseId, body?.reasonCode);
  }
}

