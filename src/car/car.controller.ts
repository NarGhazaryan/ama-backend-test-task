import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CarService } from './car.service';
import { CreateCarDto, UpdateCarDto } from './car.dto';
import { CarEntity } from './car.entity';

@ApiTags('cars')
@Controller('cars')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CarController {
  constructor(private readonly carService: CarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new car' })
  @ApiResponse({
    status: 201,
    description: 'Car created successfully',
    type: CarEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createCarDto: CreateCarDto): Promise<CarEntity> {
    return this.carService.create(createCarDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cars with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of cars',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CarEntity' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{
    data: CarEntity[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    return this.carService.findAll(page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get car statistics' })
  @ApiResponse({
    status: 200,
    description: 'Car statistics including count, avg/min/max price',
  })
  async getStats(): Promise<{
    count: string;
    avgPrice: string;
    minPrice: string;
    maxPrice: string;
  }> {
    return this.carService.stats() as Promise<{
      count: string;
      avgPrice: string;
      minPrice: string;
      maxPrice: string;
    }>;
  }

  @Get('stats/average-price-per-model')
  @ApiOperation({
    summary: 'Get average price per model',
  })
  @ApiResponse({
    status: 200,
    description: 'Average price grouped by make and model',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          make: { type: 'string' },
          model: { type: 'string' },
          averagePrice: { type: 'number' },
        },
      },
    },
  })
  async averagePricePerModel(): Promise<
    Array<{ make: string; model: string; averagePrice: number }>
  > {
    return this.carService.averagePricePerModel();
  }

  @Get('stats/make-percentage')
  @ApiOperation({
    summary: 'Get percentage distribution by make',
  })
  @ApiResponse({
    status: 200,
    description: 'Percentage of cars per make',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          make: { type: 'string' },
          percentage: { type: 'number' },
        },
      },
    },
  })
  async makePercentage(): Promise<Array<{ make: string; percentage: number }>> {
    return this.carService.makePercentage();
  }

  @Get('stats/model-percentage')
  @ApiOperation({
    summary: 'Get percentage distribution by model',
  })
  @ApiResponse({
    status: 200,
    description: 'Percentage of cars per model',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          model: { type: 'string' },
          percentage: { type: 'number' },
        },
      },
    },
  })
  async modelPercentage(): Promise<
    Array<{ model: string; percentage: number }>
  > {
    return this.carService.modelPercentage();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a car by ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Car found',
    type: CarEntity,
  })
  @ApiResponse({ status: 404, description: 'Car not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CarEntity> {
    return this.carService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a car' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Car updated successfully',
    type: CarEntity,
  })
  @ApiResponse({ status: 404, description: 'Car not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarDto: UpdateCarDto,
  ): Promise<CarEntity> {
    return this.carService.update(id, updateCarDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a car' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 204,
    description: 'Car deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Car not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.carService.remove(id);
  }
}
