import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IncomingCallDto {
  @ApiProperty({ description: 'Unique call identifier' })
  @IsString()
  @IsNotEmpty()
  callId!: string;

  @ApiProperty({ description: 'Caller phone number' })
  @IsString()
  @IsNotEmpty()
  from!: string;

  @ApiProperty({ description: 'Called phone number' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Call direction', enum: ['inbound', 'outbound'] })
  @IsString()
  @IsOptional()
  direction?: 'inbound' | 'outbound';

  @ApiProperty({ description: 'Additional call metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
} 