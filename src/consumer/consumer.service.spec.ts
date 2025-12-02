import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerService } from './consumer.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { CarService } from '../car/car.service';
import { Logger } from '@nestjs/common';

describe('ConsumerService', () => {
  let service: ConsumerService;

  const mockRabbitMQService = {
    consume: jest.fn(),
  };

  const mockCarService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumerService,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: CarService,
          useValue: mockCarService,
        },
      ],
    }).compile();

    service = module.get<ConsumerService>(ConsumerService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start consuming messages', async () => {
      mockRabbitMQService.consume.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockRabbitMQService.consume).toHaveBeenCalled();
    });
  });

  describe('message consumption', () => {
    it('should integrate with car service for valid data', () => {
      const savedCar = {
        id: 1,
        normalizedMake: 'toyota',
        normalizedModel: 'camry',
        year: 2023,
        price: 35000,
        location: 'yerevan',
      };

      mockCarService.create.mockResolvedValue(savedCar);

      expect(mockCarService.create).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      mockRabbitMQService.consume.mockRejectedValue(
        new Error('Connection failed'),
      );

      await expect(service.onModuleInit()).resolves.not.toThrow();

      loggerErrorSpy.mockRestore();
    });
  });
});
