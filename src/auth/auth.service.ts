import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './user.entity';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultUser();
  }

  private async seedDefaultUser() {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { username: 'admin' },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await this.userRepository.save({
          username: 'admin',
          password: hashedPassword,
        });
        this.logger.log('Default user created: admin / admin123');
      }
    } catch (error) {
      this.logger.error('Failed to seed default user', error);
    }
  }

  async validateUser(username: string, password: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    };

    return {
      access_token: this.jwtService.sign(payload),
      token_type: 'Bearer',
      expires_in: '24h',
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { username: registerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userRepository.save({
      username: registerDto.username,
      password: hashedPassword,
    });

    this.logger.log(`New user registered: ${user.username}`);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    };

    return {
      access_token: this.jwtService.sign(payload),
      token_type: 'Bearer',
      expires_in: '24h',
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }
}
