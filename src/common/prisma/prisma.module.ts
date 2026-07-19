import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { PrismaErrorHandlerService } from './services/prisma-error-handler.service';
import { PrismaHttpExceptionMapperService } from './services/prisma-http-exception-mapper.service';



@Global()
@Module({
  providers:[
    PrismaService,
    PrismaErrorHandlerService,
    PrismaHttpExceptionMapperService,
  ],

  exports:[
    PrismaService,
    PrismaErrorHandlerService,
    PrismaHttpExceptionMapperService,
  ],
})
export class PrismaModule {}