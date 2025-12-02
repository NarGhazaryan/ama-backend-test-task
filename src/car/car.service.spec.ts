/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { CarService } from './car.service';
import { Repository } from 'typeorm';
import { CarEntity } from './car.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CreateCarDto, UpdateCarDto } from './car.dto';

describe('CarService', () => {
  let service: CarService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let repository: Repository<CarEntity>;

  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarService,
        {
          provide: getRepositoryToken(CarEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CarService>(CarService);
    repository = module.get<Repository<CarEntity>>(
      getRepositoryToken(CarEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a car', async () => {
      const dto: CreateCarDto = {
        normalizedMake: 'toyota',
        normalizedModel: 'camry',
        year: 2023,
        price: 35000,
        location: 'yerevan',
      };

      const savedCar = { id: 1, ...dto };
      mockRepository.save.mockResolvedValue(savedCar);

      const result = await service.create(dto);

      expect(result).toEqual(savedCar);
      expect(mockRepository.save).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated cars with default parameters', async () => {
      const cars = [
        {
          id: 1,
          normalizedMake: 'toyota',
          normalizedModel: 'camry',
          year: 2023,
          price: 35000,
        },
      ];
      mockRepository.findAndCount.mockResolvedValue([cars, 1]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: cars,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        order: { id: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle pagination with custom page and limit', async () => {
      const cars = [
        {
          id: 1,
          normalizedMake: 'honda',
          normalizedModel: 'civic',
          year: 2022,
          price: 28000,
        },
      ];
      mockRepository.findAndCount.mockResolvedValue([cars, 50]);

      const result = await service.findAll(2, 20);

      expect(result.meta).toEqual({
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        order: { id: 'DESC' },
        skip: 20,
        take: 20,
      });
    });

    it('should enforce maximum limit of 100', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 200);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a car by id', async () => {
      const car = {
        id: 1,
        normalizedMake: 'toyota',
        normalizedModel: 'camry',
        year: 2023,
        price: 35000,
      };
      mockRepository.findOne.mockResolvedValue(car);

      const result = await service.findOne(1);

      expect(result).toEqual(car);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when car not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Car with ID 999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a car', async () => {
      const existingCar = {
        id: 1,
        normalizedMake: 'toyota',
        normalizedModel: 'camry',
        year: 2023,
        price: 35000,
        location: 'yerevan',
      };

      const updateDto: UpdateCarDto = {
        price: 33000,
        location: 'tbilisi',
      };

      const updatedCar = { ...existingCar, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingCar);
      mockRepository.save.mockResolvedValue(updatedCar);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedCar);
      expect(mockRepository.save).toHaveBeenCalledWith(updatedCar);
    });

    it('should throw NotFoundException when updating non-existent car', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { price: 30000 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a car', async () => {
      const car = {
        id: 1,
        normalizedMake: 'toyota',
        normalizedModel: 'camry',
        year: 2023,
        price: 35000,
      };

      mockRepository.findOne.mockResolvedValue(car);
      mockRepository.remove.mockResolvedValue(car);

      await service.remove(1);

      expect(mockRepository.remove).toHaveBeenCalledWith(car);
    });

    it('should throw NotFoundException when removing non-existent car', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('stats', () => {
    it('should return basic statistics', async () => {
      const statsResult = {
        count: '10',
        avgPrice: '40000',
        minPrice: '20000',
        maxPrice: '60000',
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(statsResult),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.stats();

      expect(result).toEqual(statsResult);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('car');
    });
  });

  describe('makePercentage', () => {
    it('should calculate make percentage distribution', async () => {
      const total = 100;
      const results = [
        { make: 'toyota', count: '50' },
        { make: 'honda', count: '30' },
        { make: 'bmw', count: '20' },
      ];

      mockRepository.count.mockResolvedValue(total);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(results),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.makePercentage();

      expect(result).toEqual([
        { make: 'toyota', percentage: 50 },
        { make: 'honda', percentage: 30 },
        { make: 'bmw', percentage: 20 },
      ]);
    });

    it('should return empty array when no cars exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.makePercentage();

      expect(result).toEqual([]);
    });
  });

  describe('modelPercentage', () => {
    it('should calculate model percentage distribution', async () => {
      const total = 100;
      const results = [
        { model: 'camry', count: '40' },
        { model: 'civic', count: '35' },
      ];

      mockRepository.count.mockResolvedValue(total);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(results),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.modelPercentage();

      expect(result).toEqual([
        { model: 'camry', percentage: 40 },
        { model: 'civic', percentage: 35 },
      ]);
    });
  });

  describe('calcPercentage', () => {
    it('should calculate percentage with proper rounding', () => {
      const calc = (service as any).calcPercentage.bind(service);

      expect(calc(50, 100)).toBe(50);
      expect(calc(33, 100)).toBe(33);
      expect(calc(1, 3)).toBe(33.33);
      expect(calc(0, 100)).toBe(0);
    });

    it('should return 0 when total is 0', () => {
      const calc = (service as any).calcPercentage.bind(service);
      expect(calc(10, 0)).toBe(0);
    });
  });
});
