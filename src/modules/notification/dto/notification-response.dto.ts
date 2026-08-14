import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';
import { AdminListDto } from 'src/common/admin/admin-list.dto';

export class NotificationResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional({ nullable: true, type: Object })
  data!: Record<string, unknown> | null;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty()
  createdAt!: Date;

  constructor(partial: Partial<NotificationResponseDto>) {
    Object.assign(this, partial);
  }
}

export class NotificationListResponseDto extends AdminListDto<NotificationResponseDto> {
  @ApiProperty({ type: [NotificationResponseDto] })
  declare items: NotificationResponseDto[];
}

export class NotificationCountResponseDto {
  @ApiProperty()
  count!: number;

  constructor(count: number) {
    this.count = count;
  }
}

export class DeviceTokenResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  accountId!: number;

  @ApiProperty({ enum: DevicePlatform })
  platform!: DevicePlatform;

  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<DeviceTokenResponseDto>) {
    Object.assign(this, partial);
  }
}

export class NotifyAccountInput {
  accountId!: number;
  type!: string;
  titleAr!: string;
  titleEn!: string;
  bodyAr!: string;
  bodyEn!: string;
  data?: Record<string, unknown> | null;
}
