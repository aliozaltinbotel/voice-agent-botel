import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CallEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ description: 'Call identifier' })
  @IsString()
  @IsNotEmpty()
  callId!: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  @IsNotEmpty()
  timestamp!: string;

  @ApiProperty({ description: 'Event data', required: false })
  @IsOptional()
  data?: Record<string, any>;
} 