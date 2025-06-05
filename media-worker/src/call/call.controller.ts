import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CallService } from './call.service';
import { IncomingCallDto } from './dto/incoming-call.dto';
import { CallEventDto } from './dto/call-event.dto';

@ApiTags('calls')
@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('incoming')
  @ApiOperation({ summary: 'Handle incoming call webhook from ACS' })
  @ApiBody({ type: IncomingCallDto })
  @ApiResponse({ status: 200, description: 'Call accepted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async handleIncomingCall(@Body() callData: IncomingCallDto) {
    return this.callService.handleIncomingCall(callData);
  }

  @Post('events')
  @ApiOperation({ summary: 'Handle call events webhook' })
  @ApiBody({ type: [CallEventDto] })
  @ApiResponse({ status: 200, description: 'Events processed' })
  async handleCallEvents(@Body() events: CallEventDto[]) {
    return this.callService.handleCallEvents(events);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get list of active calls' })
  @ApiResponse({ status: 200, description: 'List of active calls' })
  async getActiveCalls() {
    return this.callService.getActiveCalls();
  }

  @Get(':callId')
  @ApiOperation({ summary: 'Get call details' })
  @ApiResponse({ status: 200, description: 'Call details' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async getCallDetails(@Param('callId') callId: string) {
    return this.callService.getCallDetails(callId);
  }

  @Post(':callId/end')
  @ApiOperation({ summary: 'End a specific call' })
  @ApiResponse({ status: 200, description: 'Call ended' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async endCall(@Param('callId') callId: string) {
    return this.callService.endCall(callId);
  }
} 