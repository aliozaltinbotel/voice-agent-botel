import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';

export interface VoiceLiveConfig {
  model: string;
  voice: string;
  instructions: string;
  temperature?: number;
  maxResponseLength?: number;
}

export interface ConversationConfig {
  callId: string;
  phoneNumber: string;
  agentName?: string;
}

@Injectable()
export class VoiceLiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VoiceLiveService.name);
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private isConnectedFlag = false;
  private conversationId: string | null = null;
  private audioBuffer: Buffer[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const enabled = this.configService.get<boolean>('voiceLive.enabled');
    if (enabled) {
      await this.connect();
    }
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  async connect(): Promise<void> {
    const endpoint = this.configService.get<string>('voiceLive.endpoint');
    const speechKey = this.configService.get<string>('voiceLive.speechKey');
    const region = this.configService.get<string>('voiceLive.region');

    this.logger.log(`Connecting to Voice Live API at ${endpoint}`);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(endpoint!, {
          headers: {
            'Ocp-Apim-Subscription-Key': speechKey!,
            'X-Microsoft-OutputFormat': 'audio-16khz-16bit-mono-pcm',
          },
        });

        this.ws.on('open', () => {
          this.logger.log('Connected to Voice Live API');
          this.isConnectedFlag = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.logger.error('WebSocket error:', error);
          this.eventEmitter.emit('voice-live.error', error);
        });

        this.ws.on('close', (code: number, reason: string) => {
          this.logger.log(`WebSocket closed: ${code} - ${reason}`);
          this.isConnectedFlag = false;
          this.handleReconnect();
        });
      } catch (error) {
        this.logger.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  async startConversation(
    conversationConfig: ConversationConfig,
    voiceConfig: VoiceLiveConfig,
  ): Promise<void> {
    if (!this.isConnectedFlag || !this.ws) {
      throw new Error('Not connected to Voice Live API');
    }

    this.conversationId = conversationConfig.callId;

    const config = {
      type: 'conversation.start',
      conversation: {
        id: conversationConfig.callId,
        metadata: {
          phoneNumber: conversationConfig.phoneNumber,
          timestamp: new Date().toISOString(),
        },
      },
      config: {
        model: voiceConfig.model,
        voice: voiceConfig.voice,
        instructions: voiceConfig.instructions,
        temperature: voiceConfig.temperature || 0.7,
        max_response_length: voiceConfig.maxResponseLength || 4096,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: this.getTools(),
      },
    };

    this.send(config);
    this.logger.log(`Started conversation: ${this.conversationId}`);
  }

  sendAudio(audioData: Buffer): void {
    if (!this.isConnectedFlag || !this.ws) {
      this.audioBuffer.push(audioData);
      return;
    }

    // Send any buffered audio first
    while (this.audioBuffer.length > 0) {
      const buffered = this.audioBuffer.shift();
      if (buffered) {
        this.ws.send(buffered);
      }
    }

    // Send current audio
    this.ws.send(audioData);
  }

  endConversation(): void {
    if (this.ws && this.isConnectedFlag) {
      this.send({
        type: 'conversation.end',
        conversationId: this.conversationId,
      });

      this.conversationId = null;
      this.logger.log('Ended conversation');
    }
  }

  sendToolResult(callId: string, result: unknown): void {
    this.send({
      type: 'tool.result',
      callId,
      result,
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnectedFlag = false;
    }
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  getEndpoint(): string {
    return this.configService.get<string>('voiceLive.endpoint') || '';
  }

  private send(message: any): void {
    if (this.ws && this.isConnectedFlag) {
      const json = JSON.stringify(message);
      this.ws.send(json);
      this.logger.debug(`Sent message: ${message.type}`);
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      // Check if it's binary audio data
      if (data instanceof Buffer) {
        this.eventEmitter.emit('voice-live.audio', data);
        return;
      }

      // Parse JSON messages
      const message = JSON.parse(data.toString());
      this.logger.debug(`Received message: ${message.type}`);

      switch (message.type) {
        case 'conversation.started':
          this.eventEmitter.emit('voice-live.conversation.started', message);
          break;

        case 'conversation.ended':
          this.eventEmitter.emit('voice-live.conversation.ended', message);
          break;

        case 'turn.start':
          this.eventEmitter.emit('voice-live.turn.start', message);
          break;

        case 'turn.end':
          this.eventEmitter.emit('voice-live.turn.end', message);
          break;

        case 'speech.start':
          this.eventEmitter.emit('voice-live.speech.start', message);
          break;

        case 'speech.end':
          this.eventEmitter.emit('voice-live.speech.end', message);
          break;

        case 'transcript':
          this.eventEmitter.emit('voice-live.transcript', message);
          break;

        case 'tool.call':
          this.handleToolCall(message);
          break;

        case 'error':
          this.logger.error('Voice Live error:', message);
          this.eventEmitter.emit('voice-live.error', new Error(message.message));
          break;

        default:
          this.logger.debug(`Unhandled message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle message:', error);
    }
  }

  private handleToolCall(message: any): void {
    const { tool, arguments: args, callId } = message;

    this.logger.log(`Received tool call: ${tool}`);
    this.eventEmitter.emit('voice-live.tool.call', { tool, arguments: args, callId });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      this.eventEmitter.emit('voice-live.disconnected');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.logger.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'schedule_demo',
          description: 'Schedule a demo appointment for the prospect',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Preferred date for the demo (YYYY-MM-DD)',
              },
              time: {
                type: 'string',
                description: 'Preferred time for the demo (HH:MM)',
              },
              email: {
                type: 'string',
                description: 'Contact email address',
              },
              companyName: {
                type: 'string',
                description: 'Company or property management name',
              },
              propertyCount: {
                type: 'number',
                description: 'Number of properties managed',
              },
              phoneNumber: {
                type: 'string',
                description: 'Contact phone number',
              },
            },
            required: ['date', 'time', 'email', 'companyName'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_availability',
          description: 'Check available demo slots for a specific date',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date to check availability (YYYY-MM-DD)',
              },
            },
            required: ['date'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'send_information',
          description: 'Send product information to the prospect via email',
          parameters: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'Email address to send information to',
              },
              topics: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Topics of interest (pricing, features, integration, etc.)',
              },
            },
            required: ['email'],
          },
        },
      },
    ];
  }
} 