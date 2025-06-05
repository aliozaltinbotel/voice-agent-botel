import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { VoiceLiveService } from '../voice-live/voice-live.service';
import { IncomingCallDto } from './dto/incoming-call.dto';
import { CallEventDto } from './dto/call-event.dto';

export interface CallInfo {
  callId: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'ended' | 'failed';
  metadata?: Record<string, any>;
}

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private readonly activeCalls = new Map<string, CallInfo>();
  private systemPrompt!: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly voiceLiveService: VoiceLiveService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.loadSystemPrompt();
  }

  private loadSystemPrompt(): void {
    // In production, this would come from Key Vault
    this.systemPrompt = `You are Sarah, an AI-powered Sales Development Representative for Botel AI. 
You're warm, professional, and genuinely interested in helping short-term rental operators succeed.

Your primary goal is to book qualified demos for our AI voice agent solution that helps property managers automate guest communications.

Key benefits to mention:
- 24/7 guest support without hiring additional staff
- Handles booking inquiries, maintenance requests, and check-in questions
- Integrates seamlessly with popular property management systems
- Saves property managers 20+ hours per week

Qualification criteria:
- Manages 5 or more short-term rental properties
- Currently handling guest calls manually or with limited automation
- Interested in improving guest experience and operational efficiency

Always:
- Be conversational and natural - this is a phone conversation, not a script
- Listen actively for pain points and respond specifically to them
- Keep responses concise (under 50 words when possible)
- Ask one question at a time
- Guide the conversation toward booking a demo when appropriate

Remember: You're having a natural conversation. Adapt based on what the prospect shares.`;
  }

  async handleIncomingCall(callData: IncomingCallDto) {
    const { callId, from, to, direction = 'inbound' } = callData;

    this.logger.log(`Handling incoming call: ${callId} from ${from} to ${to}`);

    const callInfo: CallInfo = {
      callId,
      from,
      to,
      direction,
      startTime: new Date(),
      status: 'active',
      metadata: callData.metadata,
    };

    this.activeCalls.set(callId, callInfo);

    try {
      // Start Voice Live conversation
      await this.voiceLiveService.startConversation(
        {
          callId,
          phoneNumber: from,
        },
        {
          model: this.configService.get<string>('voiceLive.model') || 'gpt-4o-realtime-preview',
          voice: 'alloy',
          instructions: this.systemPrompt,
          temperature: 0.7,
          maxResponseLength: 4096,
        },
      );

      this.logger.log(`Voice Live conversation started for call: ${callId}`);

      // Emit event for monitoring
      this.eventEmitter.emit('call.started', callInfo);

      return {
        status: 'accepted',
        callId,
        message: 'Call accepted and voice conversation started',
      };
    } catch (error) {
      this.logger.error(`Failed to start call ${callId}:`, error);
      callInfo.status = 'failed';
      
      this.eventEmitter.emit('call.failed', { callInfo, error });
      
      throw error;
    }
  }

  async handleCallEvents(events: CallEventDto[]) {
    for (const event of events) {
      this.logger.debug(`Processing call event: ${event.type} for call ${event.callId}`);

      switch (event.type) {
        case 'callEnded':
          await this.handleCallEnded(event.callId);
          break;
        case 'callTransferred':
          await this.handleCallTransferred(event.callId, event.data);
          break;
        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }
    }

    return { processed: events.length, status: 'ok' };
  }

  private async handleCallEnded(callId: string) {
    const callInfo = this.activeCalls.get(callId);
    if (!callInfo) {
      this.logger.warn(`Call not found: ${callId}`);
      return;
    }

    callInfo.endTime = new Date();
    callInfo.status = 'ended';

    // End Voice Live conversation
    this.voiceLiveService.endConversation();

    // Emit event for monitoring and storage
    this.eventEmitter.emit('call.ended', {
      callInfo,
      duration: callInfo.endTime.getTime() - callInfo.startTime.getTime(),
    });

    // Clean up after a delay to allow final processing
    setTimeout(() => {
      this.activeCalls.delete(callId);
    }, 5000);

    this.logger.log(`Call ended: ${callId}`);
  }

  private async handleCallTransferred(callId: string, data: any) {
    this.logger.log(`Call transferred: ${callId}`, data);
    // Handle call transfer logic
  }

  getActiveCalls() {
    const calls = Array.from(this.activeCalls.values())
      .filter(call => call.status === 'active')
      .map(call => ({
        callId: call.callId,
        from: call.from,
        to: call.to,
        duration: Date.now() - call.startTime.getTime(),
        startTime: call.startTime,
      }));

    return {
      count: calls.length,
      calls,
    };
  }

  getCallDetails(callId: string) {
    const callInfo = this.activeCalls.get(callId);
    if (!callInfo) {
      throw new NotFoundException(`Call not found: ${callId}`);
    }

    return {
      ...callInfo,
      duration: callInfo.endTime
        ? callInfo.endTime.getTime() - callInfo.startTime.getTime()
        : Date.now() - callInfo.startTime.getTime(),
    };
  }

  async endCall(callId: string) {
    const callInfo = this.activeCalls.get(callId);
    if (!callInfo) {
      throw new NotFoundException(`Call not found: ${callId}`);
    }

    await this.handleCallEnded(callId);

    return {
      status: 'ended',
      callId,
      message: 'Call ended successfully',
    };
  }

  // Event handlers for Voice Live events
  @OnEvent('voice-live.transcript')
  handleTranscript(data: any) {
    this.logger.debug('Transcript:', data);
    // Store transcript in database
    this.eventEmitter.emit('transcript.received', data);
  }

  @OnEvent('voice-live.tool.call')
  async handleToolCall(data: any) {
    const { tool, arguments: args, callId } = data;

    this.logger.log(`Processing tool call: ${tool}`);

    try {
      let result;
      switch (tool) {
        case 'schedule_demo':
          result = await this.scheduleDemo(args);
          break;
        case 'check_availability':
          result = await this.checkAvailability(args);
          break;
        case 'send_information':
          result = await this.sendInformation(args);
          break;
        default:
          throw new Error(`Unknown tool: ${tool}`);
      }

      this.voiceLiveService.sendToolResult(callId, result);
    } catch (error) {
      this.logger.error(`Tool call failed: ${tool}`, error);
      this.voiceLiveService.sendToolResult(callId, {
        error: 'Failed to process request',
      });
    }
  }

  private async scheduleDemo(args: any) {
    const { date, time, email, companyName, propertyCount, phoneNumber } = args;

    this.logger.log(`Scheduling demo for ${companyName} on ${date} at ${time}`);

    // Mock implementation - would integrate with CRM/calendar
    const confirmationId = `DEMO-${Date.now()}`;

    this.eventEmitter.emit('demo.scheduled', {
      confirmationId,
      date,
      time,
      email,
      companyName,
      propertyCount,
      phoneNumber,
    });

    return {
      success: true,
      confirmationId,
      message: `Demo scheduled for ${date} at ${time}. Confirmation sent to ${email}.`,
    };
  }

  private async checkAvailability(args: any) {
    const { date } = args;

    // Mock implementation
    const availableSlots = [
      '10:00 AM',
      '11:00 AM',
      '2:00 PM',
      '3:00 PM',
      '4:00 PM',
    ];

    return {
      date,
      available: true,
      slots: availableSlots,
    };
  }

  private async sendInformation(args: any) {
    const { email, topics } = args;

    this.logger.log(`Sending information to ${email} about ${topics?.join(', ')}`);

    this.eventEmitter.emit('information.requested', {
      email,
      topics,
    });

    return {
      success: true,
      message: `Information about ${topics?.join(', ') || 'Botel AI'} sent to ${email}.`,
    };
  }
} 