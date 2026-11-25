import { Module } from '@nestjs/common';
import { StoreModule } from './domain/store.module';
import { HealthModule } from './modules/health/health.module';
import { NursesModule } from './modules/nurses/nurses.module';
import { RequestsModule } from './modules/requests/requests.module';
import { OffersModule } from './modules/offers/offers.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { AdminModule } from './modules/admin/admin.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
    GatewayModule,
    StoreModule,
    HealthModule,
    NursesModule,
    RequestsModule,
    OffersModule,
    BookingsModule,
    AdminModule,
  ],
})
export class AppModule {}
