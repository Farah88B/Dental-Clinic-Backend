import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

// `code` is immutable after creation — it's the stable programmatic key
// referenced by seeds and by role-based checks (e.g. "is this the DOCTOR role?").
export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['code'] as const),
) {}