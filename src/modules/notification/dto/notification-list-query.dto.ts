import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

function parseOptionalBoolean(raw: unknown): boolean | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value as boolean;
}

export class NotificationListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'true returns read notifications; false returns unread. Omit to return all.',
  })
  @IsOptional()
  @Transform(({ obj, key }) => parseOptionalBoolean(obj[key]))
  @IsBoolean()
  isRead?: boolean;
}
