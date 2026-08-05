import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { envValidationSchema }from './config/env.validation';
import configuration from './config/configuration';
import { AppLoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HealthModule } from './health/health.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountRolesModule } from './modules/account-roles/account-roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClinicSettingsModule } from './modules/clinic-setting/clinic-settings.module';
import { PatientFormModule } from './modules/patient-form/patient-form.module';
import { ClinicScheduleModule } from './modules/clinic-schedule/clinic-schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({

  isGlobal: true,

  load: [configuration],

  validationSchema: envValidationSchema,

}),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute window
        limit: 100, // 100 requests / minute / IP as a sane default
      },
    ]),
   AppLoggerModule,
    PrismaModule,
    TerminusModule,
   HealthModule,
   
     RolesModule,
     PermissionsModule,
     AccountRolesModule,
     AccountsModule,
     AuthModule,
     ClinicSettingsModule,
      PatientFormModule,
      ClinicScheduleModule,
  ],
  controllers: [AppController],
providers: [
  AppService,
  // Global Guards
  {
    provide: APP_GUARD,
    useClass: AppThrottlerGuard,
  },

  // Global Interceptors
  {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ResponseTransformInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: AuditLogInterceptor,
  },

  // Global Filters
  {
 provide: APP_FILTER,
 useClass: PrismaExceptionFilter,
},
  {
 provide: APP_FILTER,
 useClass: HttpExceptionFilter,
},



]
})


export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
   consumer
      .apply(RequestIdMiddleware)
      .forRoutes('{*path}');
  }
}