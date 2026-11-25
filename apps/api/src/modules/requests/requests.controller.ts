import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { MemoryStore } from '../../domain/store';
import { CareQuoteRequest, CareRequestInput } from '../../common/types';

@Controller('v1/care-requests')
export class RequestsController {
  constructor(@Inject(MemoryStore) private readonly store: MemoryStore) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  createQuote(@Body() body: CareQuoteRequest) {
    return this.store.createQuote(body);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createCareRequest(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CareRequestInput,
  ) {
    const result = this.store.createCareRequest(body, idempotencyKey);
    return {
      bookingId: result.booking.id,
      status: result.booking.status,
      version: result.booking.version,
      createdAt: result.booking.createdAt,
      roundId: result.round?.id,
    };
  }
}

