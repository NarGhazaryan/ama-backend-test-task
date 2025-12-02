import { Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { CarModule } from '../car/car.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [CarModule, RabbitMQModule],
  providers: [ConsumerService],
})
export class ConsumerModule {}
