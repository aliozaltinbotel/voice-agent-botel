import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as speechSdk from 'microsoft-cognitiveservices-speech-sdk';

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
  private speechConfig: speechSdk.SpeechConfig | null = null;
  private audioConfig: speechSdk.AudioConfig | null = null;
  private speechRecognizer: speechSdk.SpeechRecognizer | null = null;
  private speechSynthesizer: speechSdk.SpeechSynthesizer | null = null;
  private isConnectedFlag = false;
  private conversationId: string | null = null;
  private audioBuffer: Buffer[] = [];
  private pushStream: speechSdk.PushAudioInputStream | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const enabled = this.configService.get<boolean>('voiceLive.enabled');
    if (enabled) {
      // Initialize Speech SDK in background - don't block application startup
      this.initializeSpeechSDK().catch((error) => {
        this.logger.error('Failed to initialize Azure Speech SDK during startup:', error);
        this.logger.warn('Voice Live API will be unavailable. Application will continue without it.');
      });
    }
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  async initializeSpeechSDK(): Promise<void> {
    const speechKey = this.configService.get<string>('speech.key');
    const region = this.configService.get<string>('speech.region');

    if (!speechKey || !region) {
      throw new Error('Speech service key and region are required for Voice Live API');
    }

    try {
      // Create Speech Configuration
      this.speechConfig = speechSdk.SpeechConfig.fromSubscription(speechKey, region);
      
      // Configure speech recognition settings
      this.speechConfig.speechRecognitionLanguage = 'en-US';
      this.speechConfig.outputFormat = speechSdk.OutputFormat.Simple;
      
      // Enable continuous recognition for real-time processing
      this.speechConfig.setProperty(
        speechSdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        '5000'
      );
      this.speechConfig.setProperty(
        speechSdk.PropertyId.Speech_SegmentationSilenceTimeoutMs,
        '500'
      );

      // Create push stream for audio input
      this.pushStream = speechSdk.AudioInputStream.createPushStream();
      this.audioConfig = speechSdk.AudioConfig.fromStreamInput(this.pushStream);

      // Create speech recognizer
      this.speechRecognizer = new speechSdk.SpeechRecognizer(this.speechConfig, this.audioConfig);

      // Set up event handlers
      this.setupEventHandlers();

      // Create speech synthesizer for TTS
      this.speechSynthesizer = new speechSdk.SpeechSynthesizer(this.speechConfig);

      this.isConnectedFlag = true;
      this.logger.log('Azure Speech SDK initialized successfully');

      // Process any buffered audio
      this.processBufferedAudio();

    } catch (error) {
      this.logger.error('Failed to initialize Azure Speech SDK:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.speechRecognizer) return;

    // Handle recognition results
    this.speechRecognizer.recognizing = (sender, e) => {
      this.logger.debug(`Recognizing: ${e.result.text}`);
      this.eventEmitter.emit('voice-live.recognizing', {
        conversationId: this.conversationId,
        text: e.result.text,
        isPartial: true,
      });
    };

    this.speechRecognizer.recognized = (sender, e) => {
      if (e.result.reason === speechSdk.ResultReason.RecognizedSpeech) {
        this.logger.log(`Recognized: ${e.result.text}`);
        this.eventEmitter.emit('voice-live.recognized', {
          conversationId: this.conversationId,
          text: e.result.text,
          isPartial: false,
        });
        
        // Process the recognized text (this would typically go to your AI model)
        this.processRecognizedText(e.result.text);
      } else if (e.result.reason === speechSdk.ResultReason.NoMatch) {
        this.logger.debug('No speech could be recognized');
      }
    };

    this.speechRecognizer.canceled = (sender, e) => {
      this.logger.error(`Recognition canceled: ${e.reason}`);
      if (e.reason === speechSdk.CancellationReason.Error) {
        this.logger.error(`Error details: ${e.errorDetails}`);
        this.eventEmitter.emit('voice-live.error', new Error(e.errorDetails));
      }
    };

    this.speechRecognizer.sessionStarted = (sender, e) => {
      this.logger.log('Speech recognition session started');
      this.eventEmitter.emit('voice-live.session.started', {
        conversationId: this.conversationId,
        sessionId: e.sessionId,
      });
    };

    this.speechRecognizer.sessionStopped = (sender, e) => {
      this.logger.log('Speech recognition session stopped');
      this.eventEmitter.emit('voice-live.session.stopped', {
        conversationId: this.conversationId,
        sessionId: e.sessionId,
      });
    };
  }

  async startConversation(
    conversationConfig: ConversationConfig,
    voiceConfig: VoiceLiveConfig,
  ): Promise<void> {
    if (!this.isConnectedFlag || !this.speechRecognizer) {
      throw new Error('Azure Speech SDK not initialized');
    }

    this.conversationId = conversationConfig.callId;

    try {
      // Start continuous recognition
      await this.speechRecognizer.startContinuousRecognitionAsync();
      
      this.logger.log(`Started conversation: ${this.conversationId}`);
      this.eventEmitter.emit('voice-live.conversation.started', {
        conversationId: this.conversationId,
        config: conversationConfig,
        voiceConfig,
      });

    } catch (error) {
      this.logger.error('Failed to start conversation:', error);
      throw error;
    }
  }

  sendAudio(audioData: Buffer): void {
    if (!this.isConnectedFlag || !this.pushStream) {
      // Buffer audio if not connected yet
      this.audioBuffer.push(audioData);
      return;
    }

    try {
      // Convert Buffer to ArrayBuffer for Speech SDK
      const arrayBuffer = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength
      );
      
      // Write audio data to push stream
      this.pushStream.write(arrayBuffer);
      
    } catch (error) {
      this.logger.error('Failed to send audio data:', error);
      this.eventEmitter.emit('voice-live.error', error);
    }
  }

  private processBufferedAudio(): void {
    if (this.audioBuffer.length > 0 && this.pushStream) {
      this.logger.log(`Processing ${this.audioBuffer.length} buffered audio chunks`);
      
      for (const audioData of this.audioBuffer) {
        this.sendAudio(audioData);
      }
      
      this.audioBuffer = [];
    }
  }

  private async processRecognizedText(text: string): Promise<void> {
    // This is where you would integrate with your AI model
    // For now, we'll just emit an event
    this.eventEmitter.emit('voice-live.text.processed', {
      conversationId: this.conversationId,
      inputText: text,
      timestamp: new Date().toISOString(),
    });

    // Example: Generate a response using TTS
    await this.synthesizeResponse(`I heard you say: ${text}`);
  }

  private async synthesizeResponse(text: string): Promise<void> {
    if (!this.speechSynthesizer) {
      this.logger.warn('Speech synthesizer not available');
      return;
    }

    try {
      const result = await new Promise<speechSdk.SpeechSynthesisResult>((resolve, reject) => {
        this.speechSynthesizer!.speakTextAsync(
          text,
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      if (result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted) {
        this.logger.log('Speech synthesis completed');
        this.eventEmitter.emit('voice-live.response.synthesized', {
          conversationId: this.conversationId,
          text,
          audioData: result.audioData,
        });
      } else {
        this.logger.error('Speech synthesis failed:', result.errorDetails);
      }

    } catch (error) {
      this.logger.error('Failed to synthesize speech:', error);
    }
  }

  async endConversation(): Promise<void> {
    if (this.speechRecognizer) {
      try {
        await this.speechRecognizer.stopContinuousRecognitionAsync();
        this.logger.log(`Ended conversation: ${this.conversationId}`);
        
        this.eventEmitter.emit('voice-live.conversation.ended', {
          conversationId: this.conversationId,
        });
        
      } catch (error) {
        this.logger.error('Failed to stop recognition:', error);
      }
    }
    
    this.conversationId = null;
  }

  sendToolResult(callId: string, result: unknown): void {
    // Tool results would be processed here
    this.eventEmitter.emit('voice-live.tool.result', {
      conversationId: this.conversationId,
      callId,
      result,
    });
  }

  disconnect(): void {
    this.isConnectedFlag = false;
    
    if (this.speechRecognizer) {
      this.speechRecognizer.close();
      this.speechRecognizer = null;
    }
    
    if (this.speechSynthesizer) {
      this.speechSynthesizer.close();
      this.speechSynthesizer = null;
    }
    
    if (this.pushStream) {
      this.pushStream.close();
      this.pushStream = null;
    }
    
    this.speechConfig = null;
    this.audioConfig = null;
    this.conversationId = null;
    this.audioBuffer = [];
    
    this.logger.log('Disconnected from Azure Speech Services');
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  getEndpoint(): string {
    const region = this.configService.get<string>('speech.region');
    return `https://${region}.api.cognitive.microsoft.com/`;
  }

  // Health check method for connectivity testing
  async testConnection(): Promise<boolean> {
    if (!this.speechConfig) {
      return false;
    }

    try {
      // Create a simple test recognizer to verify connection
      const testAudioConfig = speechSdk.AudioConfig.fromDefaultMicrophoneInput();
      const testRecognizer = new speechSdk.SpeechRecognizer(this.speechConfig, testAudioConfig);
      
      // Test the connection by creating the recognizer
      testRecognizer.close();
      return true;
      
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }
} 