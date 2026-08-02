import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { SetLanguageDto } from '../dto/update-preferences.dto';
import { TokenPairDto } from '../dto/token-pair.dto';
import { ActivationRequiredDto } from '../dto/activation-required.dto';
import { OtpRequiredDto } from '../dto/otp-required.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiBaseUnionResponse } from 'src/common/decorators/api-base-union-response.decorator';
import { AuthMeDto } from '../dto/auth-me.dto';

@ApiTags('Auth - Shared')
@Controller('auth')
export class AuthSharedController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login — يُستخدم من: تطبيق المريض + لوحة تحكم الطاقم. Returns tokens if ACTIVE, {activationRequired, temporaryToken} if INVITED, or {otpRequired, temporaryToken} if PENDING_ACTIVATION' })
  @ApiBaseUnionResponse(TokenPairDto, ActivationRequiredDto, OtpRequiredDto)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new token pair — مشترك' })
  @ApiBaseResponse(TokenPairDto)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout (stateless — client discards tokens) — مشترك' })
  logout() {
    return this.authService.logout();
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated account profile — مشترك' })
  @ApiBaseResponse(AuthMeDto)
  me(@ReqUser('id') accountId: number) {
    return this.authService.me(accountId);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change password for logged-in ACTIVE account (requires current password) — مشترك' })
  changePassword(@ReqUser('id') accountId: number, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(accountId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Patch('language')
  @ApiOperation({ summary: 'Update the authenticated account language — مشترك' })
  setLanguage(@ReqUser('id') accountId: number, @Body() dto: SetLanguageDto) {
    return this.authService.setLanguage(accountId, dto);
  }
}
