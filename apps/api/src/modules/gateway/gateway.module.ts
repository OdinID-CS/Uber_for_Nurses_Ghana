import { Global, Module } from '@nestjs/common';
import { DispatchGateway } from './dispatch.gateway';

@Global()
@Module({
  providers: [DispatchGateway],
  exports: [DispatchGateway],
})
export class GatewayModule {}

