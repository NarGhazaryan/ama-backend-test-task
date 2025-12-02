import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Username (unique)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 6 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
