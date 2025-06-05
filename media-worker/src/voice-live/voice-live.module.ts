import { Module, Global } from '@nestjs/common';
import { VoiceLiveService } from './voice-live.service';

@Global()
@Module({
  providers: [VoiceLiveService],
  exports: [VoiceLiveService],
})
export class VoiceLiveModule {} 