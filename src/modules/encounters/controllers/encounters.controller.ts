import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaFileCategory } from '@prisma/client';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { createMediaMulterOptions } from 'src/common/media/config/media-multer.config';
import { EncountersService } from '../services/encounters.service';
import { UpdateEncounterDto } from '../dto/update-encounter.dto';
import { CreateMedicalAttachmentDto } from '../dto/create-medical-attachment.dto';
import {
  EncounterResponseDto,
  MedicalAttachmentResponseDto,
} from '../dto/encounter-response.dto';

@ApiTags('Treatment Sessions (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}
/*
  @Get(':id')
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({ summary: 'Get an encounter — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(EncounterResponseDto)
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.encountersService.getById(id);
  }

  @Patch(':id')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('UPDATE_ENCOUNTER')
  @ApiOperation({
    summary: 'Update encounter clinical fields — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(EncounterResponseDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEncounterDto,
  ) {
    return this.encountersService.update(id, dto);
  }
*/
  @Post(':id/attachments')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('CREATE_MEDICAL_ATTACHMENT')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files', 'type'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          minItems: 1,
          maxItems: 10,
          description:
            'PHOTO requires exactly 2 files; XRAY/REPORT require one or more (up to 10)',
        },
        type: { type: 'string', enum: ['XRAY', 'REPORT', 'PHOTO'] },
        title: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor(
      'files',
      10,
      createMediaMulterOptions(MediaFileCategory.OTHER, { maxFiles: 10 }),
    ),
  )
  @ApiOperation({
    summary:
      'Upload medical attachment(s) — PHOTO: exactly 2; XRAY/REPORT: 1+ — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(MedicalAttachmentResponseDto, 201)
  addAttachments(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMedicalAttachmentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @ReqUser('id') accountId: number,
  ) {
    return this.encountersService.addAttachments(id, dto, files ?? [], accountId);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('DELETE_MEDICAL_ATTACHMENT')
  @ApiOperation({ summary: 'Remove a medical attachment — يُستخدم من: لوحة تحكم الطاقم' })
  removeAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.encountersService.removeAttachment(id, attachmentId);
  }
}
