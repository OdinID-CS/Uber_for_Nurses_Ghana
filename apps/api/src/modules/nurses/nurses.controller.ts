import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Put, Post } from '@nestjs/common';
import { MemoryStore } from '../../domain/store';
import { NurseAvailability, NursePresence } from '../../common/types';

@Controller('v1/nurses/me')
export class NursesController {
  constructor(@Inject(MemoryStore) private readonly store: MemoryStore) {}

  @Put('availability')
  updateAvailability(
    @Headers('x-nurse-id') nurseHeader: string,
    @Body() body: Partial<NurseAvailability>,
  ) {
    const nurseId = nurseHeader || 'nurse-florence-01';
    return this.store.updateNurseAvailability(nurseId, body);
  }

  @Post('presence')
  @HttpCode(HttpStatus.OK)
  recordPresence(
    @Headers('x-nurse-id') nurseHeader: string,
    @Body() body: Omit<NursePresence, 'nurseId'>,
  ) {
    const nurseId = nurseHeader || 'nurse-florence-01';
    return this.store.recordPresence(nurseId, body);
  }

  @Get('offers')
  getMyOffers(@Headers('x-nurse-id') nurseHeader: string) {
    const nurseId = nurseHeader || 'nurse-florence-01';
    return this.store.getNurseOffers(nurseId);
  }
}

