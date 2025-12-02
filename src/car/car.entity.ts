import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('cars')
@Index(['normalizedMake', 'normalizedModel'])
export class CarEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Toyota' })
  @Column()
  @Index()
  normalizedMake: string;

  @ApiProperty({ example: 'Camry' })
  @Column()
  @Index()
  normalizedModel: string;

  @ApiProperty({ example: 2020 })
  @Column()
  @Index()
  year: number;

  @ApiProperty({ example: 25000 })
  @Column()
  @Index()
  price: number;

  @ApiProperty({ example: 'New York' })
  @Column()
  location: string;

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
