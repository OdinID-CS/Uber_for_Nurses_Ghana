import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { MemoryStore } from '../../domain/store';

@Controller('v1/admin')
export class AdminController {
  constructor(@Inject(MemoryStore) private readonly store: MemoryStore) {}

  @Get('nurses/pending')
  getPendingNurses() {
    return this.store.getPendingNurses();
  }

  @Post('nurses/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveNurse(@Param('id') id: string, @Body() body: { reviewer?: string }) {
    return this.store.approveNurseCredential(id, body?.reviewer);
  }

  @Post('nurses/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectNurse(@Param('id') id: string, @Body() body: { reviewer?: string; reason: string }) {
    return this.store.rejectNurseCredential(id, body?.reviewer, body.reason);
  }

  @Get('payments')
  getPayments() {
    return this.store.getPaymentTransactions();
  }

  @Get('incidents')
  getIncidents() {
    return this.store.getIncidents();
  }
}

