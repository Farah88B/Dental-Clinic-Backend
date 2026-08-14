import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDeviceTokenDto {
  @ApiProperty({
    description: 'FCM registration token for this device or browser',
  })
  @IsString()
  @MinLength(8)
  token!: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class RevokeDeviceTokenDto {
  @ApiProperty({ description: 'FCM registration token to revoke' })
  @IsString()
  @MinLength(8)
  token!: string;
}
