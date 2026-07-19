import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'API root — returns basic info' })
  getRoot(): { name: string; version: string } {
    return { name: 'Dental Clinic API', version: '1.0' };
  }
}