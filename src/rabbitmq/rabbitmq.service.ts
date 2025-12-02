import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

interface RabbitMQMessage {
  [key: string]: unknown;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private channel: amqp.Channel | null = null;
  private connection: amqp.ChannelModel | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  private exchange: string;
  private queue: string;
  private routingKey: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const url = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://localhost:5672',
      );
      this.exchange = this.configService.get<string>(
        'RABBITMQ_EXCHANGE',
        'car_exchange',
      );
      this.queue = this.configService.get<string>(
        'RABBITMQ_QUEUE',
        'car_queue',
      );
      this.routingKey = this.configService.get<string>(
        'RABBITMQ_ROUTING_KEY',
        'car.new',
      );

      const connection = await amqp.connect(url);
      this.connection = connection;
      const channel = await connection.createChannel();
      this.channel = channel;

      connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error', err);
        void this.handleConnectionError();
      });

      connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        void this.handleConnectionError();
      });

      channel.on('error', (err: Error) => {
        this.logger.error('RabbitMQ channel error', err);
      });

      await channel.assertExchange(this.exchange, 'direct', {
        durable: true,
      });

      await channel.assertQueue(this.queue, { durable: true });

      await channel.bindQueue(this.queue, this.exchange, this.routingKey);

      this.logger.log('RabbitMQ connected successfully');
    } catch (err) {
      this.logger.error('RabbitMQ connection failed', err);
      this.scheduleReconnect();
    }
  }

  private handleConnectionError(): void {
    if (this.isShuttingDown) return;
    this.channel = null;
    this.connection = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      void this.connect();
    }, 3000);
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log('RabbitMQ disconnected successfully');
    } catch (err) {
      this.logger.error('Error during RabbitMQ disconnect', err);
    }
  }

  async consume(
    callback: (msg: RabbitMQMessage) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const queue = this.configService.get<string>(
      'RABBITMQ_QUEUE',
      'default_queue',
    );

    await this.channel.consume(
      queue,
      (msg) => {
        if (!msg) return;

        void (async () => {
          try {
            const content = JSON.parse(
              msg.content.toString(),
            ) as RabbitMQMessage;
            await callback(content);
            this.channel?.ack(msg);
          } catch (err) {
            this.logger.error('Failed to process message', err);
            this.channel?.nack(msg, false, false);
          }
        })();
      },
      { noAck: false },
    );
  }
}
