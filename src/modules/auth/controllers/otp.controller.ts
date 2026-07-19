import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { OtpService } from '../services/otp.service';
import { SendOtpDto } from '../dto/send-otp.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { PrismaService } from 'src/common/prisma/services/prisma.service';

// Generic OTP endpoints, kept separate from AuthController's flow-specific
// ones (register/reset-password/change-phone) — this pair is for any FUTURE
// standalone OTP need that doesn't fit those three flows.
@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('send')
  @ApiOperation({ summary: 'Send an OTP to an existing account by phone' })
  async send(@Body() dto: SendOtpDto) {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { phone: dto.phone } });
    await this.otpService.send(account.id, dto.phone, dto.type);
  }

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify a standalone OTP' })
  async verify(@Body() dto: VerifyOtpDto) {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { phone: dto.phone } });
    await this.otpService.verify(account.id, dto.type, dto.code);
  }
}