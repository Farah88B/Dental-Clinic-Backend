import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Deliberately NOT using the full AccountStatus enum: INVITED and
// PENDING_ACTIVATION are system-managed lifecycle states set during
// registration/invitation flows, not something an admin sets manually.
// Admins may only toggle between ACTIVE and DISABLED.
const ADMIN_SETTABLE_STATUSES = ['ACTIVE', 'DISABLED'] as const;
type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

export class UpdateAccountStatusDto {
  @ApiProperty({ enum: ADMIN_SETTABLE_STATUSES })
  @IsNotEmpty()
  @IsIn(ADMIN_SETTABLE_STATUSES)
  status!: AdminSettableStatus;
}