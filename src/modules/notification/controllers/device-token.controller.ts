import {
  Body,
  Controller,
  Delete,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  CreateDeviceTokenDto,
  RevokeDeviceTokenDto,
} from '../dto/create-device-token.dto';
import { DeviceTokenResponseDto } from '../dto/notification-response.dto';
import { DeviceTokenService } from '../services/device-token.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('device-tokens')
export class DeviceTokenController {
  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  @Post()
  @ApiOperation({
    summary:
      'Register or refresh an FCM device token (Android, iOS, or Web). Idempotent.',
  })
  @ApiBaseResponse(DeviceTokenResponseDto, 201)
  register(
    @ReqUser('id') accountId: number,
    @Body() dto: CreateDeviceTokenDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.deviceTokenService.register(accountId, dto, userAgent);
  }

  @Delete()
  @ApiOperation({
    summary:
      'Revoke the current device FCM token. Idempotent if the token is already gone.',
  })
  revoke(
    @ReqUser('id') accountId: number,
    @Body() dto: RevokeDeviceTokenDto,
  ) {
    return this.deviceTokenService.revoke(accountId, dto);
  }
}
