import { Module } from '@nestjs/common';
import { ConnectivityService } from './connectivity.service';
import { ConnectivityController } from './connectivity.controller';

@Module({
  providers: [ConnectivityService],
  controllers: [ConnectivityController],
  exports: [ConnectivityService],
})
export class ConnectivityModule {} 