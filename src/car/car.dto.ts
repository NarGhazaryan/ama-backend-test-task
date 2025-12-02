import { IsString, IsNumber } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateCarDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  normalizedMake: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  normalizedModel: string;

  @ApiProperty({ example: 2020 })
  @IsNumber()
  year: number;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'New York' })
  @IsString()
  location: string;
}

export class UpdateCarDto extends PartialType(CreateCarDto) {}
