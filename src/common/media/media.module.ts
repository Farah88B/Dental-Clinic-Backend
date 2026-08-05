import { Global, Module } from '@nestjs/common';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaController } from './controllers/media.controller';
import { MediaService } from './services/media.service';
import { MediaFileAdapter } from './adapter/media-file.adapter';
import { LocalMediaStorageService } from './services/local-media-storage.service';
import { MEDIA_STORAGE_DRIVER } from './interfaces/media-storage-driver.interface';
import {
  MEDIA_PUBLIC_PATH_DEFAULT,
  MEDIA_UPLOAD_ROOT_DEFAULT,
} from './config/media.config';

@Global()
@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadRoot =
          configService.get<string>('media.uploadRoot') ??
          MEDIA_UPLOAD_ROOT_DEFAULT;
        const publicPath =
          configService.get<string>('media.publicPath') ??
          MEDIA_PUBLIC_PATH_DEFAULT;

        return [
          {
            rootPath: join(process.cwd(), uploadRoot),
            serveRoot: publicPath,
            serveStaticOptions: {
              index: false,
            },
          },
        ];
      },
    }),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaFileAdapter,
    LocalMediaStorageService,
    {
      provide: MEDIA_STORAGE_DRIVER,
      useExisting: LocalMediaStorageService,
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
