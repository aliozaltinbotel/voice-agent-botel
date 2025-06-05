import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface VoiceLiveConfig {
  endpoint: string;
  speechKey: string;
  model: string;
  systemPrompt: string;
  locale?: string;
  voice?: string;
  customVoiceEndpointId?: string;
  noiseSuppressionMode?: 'off' | 'low' | 'medium' | 'high';
  echoCancellation?: boolean;
}

interface VoiceLiveEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
}

export class VoiceLiveHandler extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: VoiceLiveConfig;
  private sessionId: string;
  private isConnected: boolean = false;

  constructor(config: VoiceLiveConfig) {
    super();
    this.config = config;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Connect to Voice Live API WebSocket
   */
  async connect(): Promise<void> {
    const headers = {
      'Ocp-Apim-Subscription-Key': this.config.speechKey,
      'X-Model': this.config.model,
      'X-Session-Id': this.sessionId,
    };

    this.ws = new WebSocket(this.config.endpoint, { headers });

    this.ws.on('open', () => {
      this.isConnected = true;
      this.emit('connected');
      this.initializeSession();
    });

    this.ws.on('message', (data: Buffer) => {
      this.handleMessage(data);
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      this.emit('disconnected');
    });
  }

  /**
   * Initialize Voice Live session with configuration
   */
  private initializeSession(): void {
    const sessionConfig: VoiceLiveEvent = {
      type: 'session.create',
      session: {
        modalities: ['audio'],
        instructions: this.config.systemPrompt,
        voice: this.config.voice || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        tools: this.getTools(),
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 4096,
      },
    };

    // Add noise suppression and echo cancellation
    if (this.config.noiseSuppressionMode !== 'off') {
      sessionConfig.session.noise_suppression = {
        mode: this.config.noiseSuppressionMode || 'medium',
      };
    }

    if (this.config.echoCancellation) {
      sessionConfig.session.echo_cancellation = true;
    }

    // Add custom voice if configured
    if (this.config.customVoiceEndpointId) {
      sessionConfig.session.voice = {
        type: 'custom',
        endpoint_id: this.config.customVoiceEndpointId,
      };
    }

    this.sendEvent(sessionConfig);
  }

  /**
   * Send audio chunk to Voice Live API
   */
  sendAudio(audioChunk: Buffer): void {
    if (!this.isConnected) {
      throw new Error('Not connected to Voice Live API');
    }

    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: audioChunk.toString('base64'),
    });
  }

  /**
   * Handle interruption (user starts speaking)
   */
  handleInterruption(): void {
    this.sendEvent({
      type: 'response.cancel',
    });
  }

  /**
   * Send a conversation event
   */
  sendEvent(event: VoiceLiveEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: Buffer): void {
    try {
      const event = JSON.parse(data.toString()) as VoiceLiveEvent;

      switch (event.type) {
        case 'session.created':
          this.emit('session.created', event);
          break;

        case 'audio.delta':
          // Audio output from the agent
          const audioBuffer = Buffer.from(event.delta, 'base64');
          this.emit('audio.output', audioBuffer);
          break;

        case 'input_audio_buffer.speech_started':
          // User started speaking
          this.emit('speech.started');
          break;

        case 'input_audio_buffer.speech_stopped':
          // User stopped speaking
          this.emit('speech.stopped');
          break;

        case 'conversation.item.created':
          // New conversation item (user or assistant message)
          this.emit('conversation.item', event.item);
          break;

        case 'response.function_call_arguments.done':
          // Function call requested
          this.emit('function.call', {
            name: event.name,
            arguments: JSON.parse(event.arguments),
          });
          break;

        case 'error':
          this.emit('error', new Error(event.error.message));
          break;

        default:
          this.emit('event', event);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Define available tools for the agent
   */
  private getTools(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'createCalendarEvent',
          description: 'Schedule a demo appointment',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Date in ISO format' },
              time: { type: 'string', description: 'Time in 24h format' },
              duration: { type: 'integer', description: 'Duration in minutes' },
              attendeeEmail: { type: 'string', description: 'Customer email' },
              notes: { type: 'string', description: 'Meeting notes' },
            },
            required: ['date', 'time', 'duration', 'attendeeEmail'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'updateCallOutcome',
          description: 'Update the outcome of the call',
          parameters: {
            type: 'object',
            properties: {
              outcome: {
                type: 'string',
                enum: ['demo_scheduled', 'follow_up_needed', 'not_interested', 'voicemail'],
              },
              notes: { type: 'string' },
            },
            required: ['outcome'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getLeadDetails',
          description: 'Get information about the lead being called',
          parameters: {
            type: 'object',
            properties: {
              phoneNumber: { type: 'string' },
            },
            required: ['phoneNumber'],
          },
        },
      },
    ];
  }

  /**
   * Disconnect from Voice Live API
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
} 