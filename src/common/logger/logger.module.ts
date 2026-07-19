/**
 * Configures the application's global logger using Pino.
 * Reads logging options from ConfigService and enables pretty logs in development.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('app.environment') === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',

            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                },
          },
        };
      },
    }),
  ],

  exports: [LoggerModule],
})
export class AppLoggerModule {}