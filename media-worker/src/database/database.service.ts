import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CosmosClient, Database, Container } from '@azure/cosmos';

export interface ConversationRecord {
  id: string;
  callId: string;
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  transcript?: string[];
  outcome?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private client: CosmosClient;
  private database: Database;
  private container: Container;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.configService.get<string>('cosmos.endpoint');
    const key = this.configService.get<string>('cosmos.key');
    
    if (!endpoint || !key) {
      this.logger.warn('Cosmos DB configuration missing, database operations will be disabled');
      return;
    }

    this.client = new CosmosClient({ endpoint, key });
    
    const databaseId = this.configService.get<string>('cosmos.database');
    const containerId = this.configService.get<string>('cosmos.container');

    this.database = this.client.database(databaseId!);
    this.container = this.database.container(containerId!);

    this.logger.log('Connected to Cosmos DB');
  }

  async saveConversation(conversation: ConversationRecord): Promise<void> {
    if (!this.container) {
      this.logger.warn('Database not initialized, skipping save');
      return;
    }

    try {
      await this.container.items.create(conversation);
      this.logger.log(`Conversation saved: ${conversation.callId}`);
    } catch (error) {
      this.logger.error('Failed to save conversation:', error);
      throw error;
    }
  }

  async getConversation(callId: string): Promise<ConversationRecord | null> {
    if (!this.container) {
      this.logger.warn('Database not initialized');
      return null;
    }

    try {
      const query = 'SELECT * FROM c WHERE c.callId = @callId';
      const { resources } = await this.container.items
        .query({
          query,
          parameters: [{ name: '@callId', value: callId }],
        })
        .fetchAll();

      return resources.length > 0 ? resources[0] : null;
    } catch (error) {
      this.logger.error('Failed to get conversation:', error);
      return null;
    }
  }

  async updateConversation(callId: string, updates: Partial<ConversationRecord>): Promise<void> {
    if (!this.container) {
      this.logger.warn('Database not initialized, skipping update');
      return;
    }

    try {
      const existing = await this.getConversation(callId);
      if (!existing) {
        this.logger.warn(`Conversation not found: ${callId}`);
        return;
      }

      const updated = { ...existing, ...updates };
      await this.container.item(existing.id, existing.callId).replace(updated);
      
      this.logger.log(`Conversation updated: ${callId}`);
    } catch (error) {
      this.logger.error('Failed to update conversation:', error);
      throw error;
    }
  }

  async getRecentConversations(limit: number = 50): Promise<ConversationRecord[]> {
    if (!this.container) {
      this.logger.warn('Database not initialized');
      return [];
    }

    try {
      const query = 'SELECT * FROM c ORDER BY c.startTime DESC OFFSET 0 LIMIT @limit';
      const { resources } = await this.container.items
        .query({
          query,
          parameters: [{ name: '@limit', value: limit }],
        })
        .fetchAll();

      return resources;
    } catch (error) {
      this.logger.error('Failed to get recent conversations:', error);
      return [];
    }
  }
} 