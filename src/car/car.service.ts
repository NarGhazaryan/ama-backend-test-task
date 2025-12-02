import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarEntity } from './car.entity';
import { CreateCarDto, UpdateCarDto } from './car.dto';

@Injectable()
export class CarService {
  constructor(
    @InjectRepository(CarEntity)
    private repo: Repository<CarEntity>,
  ) {}

  create(dto: CreateCarDto) {
    return this.repo.save(dto);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: CarEntity[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const skip = (validPage - 1) * validLimit;

    const [data, total] = await this.repo.findAndCount({
      order: { id: 'DESC' },
      skip,
      take: validLimit,
    });

    return {
      data,
      meta: {
        total,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      },
    };
  }

  async findOne(id: number): Promise<CarEntity> {
    const car = await this.repo.findOne({ where: { id } });
    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`);
    }
    return car;
  }

  async update(id: number, dto: UpdateCarDto): Promise<CarEntity> {
    const car = await this.findOne(id);
    Object.assign(car, dto);
    return this.repo.save(car);
  }

  async remove(id: number): Promise<void> {
    const car = await this.findOne(id);
    await this.repo.remove(car);
  }

  stats() {
    return this.repo
      .createQueryBuilder('car')
      .select('COUNT(*)', 'count')
      .addSelect('AVG(price)', 'avgPrice')
      .addSelect('MIN(price)', 'minPrice')
      .addSelect('MAX(price)', 'maxPrice')
      .getRawOne();
  }

  async averagePricePerModel(): Promise<
    Array<{ make: string; model: string; averagePrice: number }>
  > {
    const results = await this.repo
      .createQueryBuilder('car')
      .select('car.normalizedMake', 'make')
      .addSelect('car.normalizedModel', 'model')
      .addSelect('AVG(car.price)', 'averagePrice')
      .groupBy('car.normalizedMake')
      .addGroupBy('car.normalizedModel')
      .orderBy('"averagePrice"', 'DESC')
      .getRawMany();

    return results.map(
      (r: { make: string; model: string; averagePrice: string }) => ({
        make: r.make,
        model: r.model,
        averagePrice: parseFloat(r.averagePrice),
      }),
    );
  }

  private calcPercentage(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 10000) / 100;
  }

  async makePercentage(): Promise<Array<{ make: string; percentage: number }>> {
    const total = await this.repo.count();
    if (total === 0) return [];

    const results = await this.repo
      .createQueryBuilder('car')
      .select('car.normalizedMake', 'make')
      .addSelect('COUNT(*)', 'count')
      .groupBy('car.normalizedMake')
      .orderBy('"count"', 'DESC')
      .getRawMany();

    return results.map((r: { make: string; count: string }) => ({
      make: r.make,
      percentage: this.calcPercentage(parseFloat(r.count), total),
    }));
  }

  async modelPercentage(): Promise<
    Array<{ model: string; percentage: number }>
  > {
    const total = await this.repo.count();
    if (total === 0) return [];

    const results = await this.repo
      .createQueryBuilder('car')
      .select('car.normalizedModel', 'model')
      .addSelect('COUNT(*)', 'count')
      .groupBy('car.normalizedModel')
      .orderBy('"count"', 'DESC')
      .getRawMany();

    return results.map((r: { model: string; count: string }) => ({
      model: r.model,
      percentage: this.calcPercentage(parseFloat(r.count), total),
    }));
  }
}
