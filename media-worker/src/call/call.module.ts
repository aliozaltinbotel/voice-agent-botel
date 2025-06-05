import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CallController } from './call.controller';
import { CallService } from './call.service';
import { CallGateway } from './call.gateway';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [CallController],
  providers: [CallService, CallGateway],
  exports: [CallService],
})
export class CallModule {} 