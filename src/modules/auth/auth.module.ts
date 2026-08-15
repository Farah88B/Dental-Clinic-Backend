import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthSharedController } from './controllers/auth.shared.controller';
import { AuthPatientAppController } from './controllers/auth.patient.controller';
import { AuthStaffController } from './controllers/auth.staff.controller';
import { OtpController } from './controllers/otp.controller';
import { AuthService } from './services/auth.service';
import { PatientAccountService } from './services/patient-account.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SmsGatewayStub } from './adapter/sms-gateway.stub';
import { TraccarSmsGateway } from './adapter/traccar-sms.gateway';
import { SmsChefSmsGateway } from './adapter/smschef-sms.gateway';
import { SMS_GATEWAY } from './adapter/sms-gateway.token';
import { OTP_CODE_GENERATOR } from './adapter/otp-code-generator.token';
import { RandomOtpCodeGenerator } from './adapter/random-otp-code-generator';
import { AccountRolesModule } from '../account-roles/account-roles.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn') },
      }),
    }),
    AccountRolesModule,
  ],
  controllers: [
    AuthSharedController,
    AuthPatientAppController,
    AuthStaffController,
 //   OtpController,
  ],
  providers: [
    AuthService,
    PatientAccountService,
    OtpService,
    TokenService,
    JwtStrategy,
    {
      provide: SMS_GATEWAY,
      useFactory: (config: ConfigService) => {
        const mode = config.get<string>('sms.mode') ?? 'stub';
        if (mode !== 'live') {
          return new SmsGatewayStub();
        }

        const provider = config.get<string>('sms.provider') ?? 'traccar';
        return provider === 'smschef'
          ? new SmsChefSmsGateway(config)
          : new TraccarSmsGateway(config);
      },
      inject: [ConfigService],
    },
    {
      // Always random — stub mode exposes the code in API responses instead of using a fixed OTP.
      provide: OTP_CODE_GENERATOR,
      useClass: RandomOtpCodeGenerator,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}