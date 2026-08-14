import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DeviceTokenAdapter } from './adapter/device-token.adapter';
import { NotificationAdapter } from './adapter/notification.adapter';
import { DeviceTokenController } from './controllers/device-token.controller';
import { NotificationController } from './controllers/notification.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { DeviceTokenService } from './services/device-token.service';
import { FirebaseService } from './services/firebase.service';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationRecipientService } from './services/notification-recipient.service';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn') },
      }),
    }),
  ],
  controllers: [NotificationController, DeviceTokenController],
  providers: [
    NotificationAdapter,
    DeviceTokenAdapter,
    FirebaseService,
    DeviceTokenService,
    NotificationGateway,
    NotificationDispatcherService,
    NotificationRecipientService,
    NotificationService,
  ],
  exports: [NotificationService, NotificationRecipientService],
})
export class NotificationModule {}
