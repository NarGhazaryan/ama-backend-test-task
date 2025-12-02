import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { CarService } from '../car/car.service';
import { CreateCarDto } from '../car/car.dto';

@Injectable()
export class ConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ConsumerService.name);
  private retryTimeout?: NodeJS.Timeout;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly carService: CarService,
  ) {}

  onModuleDestroy() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  async onModuleInit() {
    this.logger.log('Starting RabbitMQ consumer...');
    await this.startConsuming();
  }

  private async startConsuming() {
    try {
      await this.rabbitMQService.consume(async (message) => {
        await this.processMessage(message);
      });
      this.logger.log('RabbitMQ consumer started successfully');
    } catch (error) {
      this.logger.error('Failed to start RabbitMQ consumer', error);

      this.retryTimeout = setTimeout(() => {
        void this.startConsuming();
      }, 5000);
    }
  }

  private async processMessage(message: Record<string, unknown>) {
    try {
      const carDto = plainToClass(CreateCarDto, message);

      const errors = await validate(carDto);

      if (errors.length > 0) {
        this.logger.warn(
          `Validation failed for message: ${JSON.stringify(errors.map((e) => e.constraints))}`,
        );

        throw new Error('Validation failed');
      }

      const saved = await this.carService.create(carDto);
      this.logger.debug(
        `Processed: ${saved.normalizedMake} ${saved.normalizedModel} (ID: ${saved.id})`,
      );
    } catch (error) {
      this.logger.error('Error processing message', error);
      throw error;
    }
  }
}
