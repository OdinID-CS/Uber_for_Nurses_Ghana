import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { MemoryStore } from '../../domain/store';
import { ClinicalChecklistInput } from '../../common/types';

@Controller('v1/bookings')
export class BookingsController {
  constructor(@Inject(MemoryStore) private readonly store: MemoryStore) {}

  @Get()
  getAllBookings() {
    return this.store.getAllBookings();
  }

  @Get(':id')
  getBooking(@Param('id') id: string) {
    return this.store.getBooking(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelBooking(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.store.cancelBooking(id, body?.reason);
  }

  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  checkIn(@Param('id') id: string, @Body() body: { pin?: string }) {
    return this.store.checkInBooking(id, body?.pin);
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  checkOut(@Param('id') id: string, @Body() body: ClinicalChecklistInput) {
    return this.store.checkOutBooking(id, body);
  }
}
