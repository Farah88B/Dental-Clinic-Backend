import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaFileCategory, MedicalAttachmentType } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { MediaService } from 'src/common/media/services/media.service';
import { TREATMENT_CONSTANTS, TREATMENT_ERROR_CODES } from 'src/common/constants/treatment.constants';
import { EncounterAdapter } from '../adapter/encounter.adapter';
import {
  encounterSelect,
  medicalAttachmentSelect,
  RawMedicalAttachmentSelect,
} from '../selectors/encounter.select';
import { UpdateEncounterDto } from '../dto/update-encounter.dto';
import { CreateMedicalAttachmentDto } from '../dto/create-medical-attachment.dto';

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encounterAdapter: EncounterAdapter,
    private readonly mediaService: MediaService,
  ) {}

  async getById(id: number) {
    const encounter = await this.prisma.encounter.findUniqueOrThrow({
      where: { id },
      select: encounterSelect(),
    });
    return this.encounterAdapter.adapt(encounter);
  }

  async getBySessionId(treatmentSessionId: number) {
    const encounter = await this.prisma.encounter.findUniqueOrThrow({
      where: { treatmentSessionId },
      select: encounterSelect(),
    });
    return this.encounterAdapter.adapt(encounter);
  }

  async update(id: number, dto: UpdateEncounterDto) {
    if (dto.teeth && dto.teeth.length !== TREATMENT_CONSTANTS.TEETH_COUNT) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.INVALID_TEETH_LENGTH);
    }

    const encounter = await this.prisma.encounter.update({
      where: { id },
      data: {
        ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis }),
        ...(dto.clinicalNotes !== undefined && { clinicalNotes: dto.clinicalNotes }),
        ...(dto.prescription !== undefined && { prescription: dto.prescription }),
        ...(dto.teeth !== undefined && { teeth: dto.teeth as object[] }),
      },
      select: encounterSelect(),
    });

    return this.encounterAdapter.adapt(encounter);
  }

  async addAttachments(
    encounterId: number,
    dto: CreateMedicalAttachmentDto,
    files: Express.Multer.File[],
    uploadedByAccountId: number,
  ) {
    if (dto.type === MedicalAttachmentType.PHOTO) {
      if (!files || files.length !== 2) {
        throw new BadRequestException(
          TREATMENT_ERROR_CODES.INVALID_ATTACHMENT_FILE_COUNT,
        );
      }
    } else if (!files || files.length < 1) {
      throw new BadRequestException(
        TREATMENT_ERROR_CODES.INVALID_ATTACHMENT_FILE_COUNT,
      );
    }

    await this.prisma.encounter.findUniqueOrThrow({ where: { id: encounterId } });

    const attachments: RawMedicalAttachmentSelect[] = [];
    for (const file of files) {
      const media = await this.mediaService.save(
        file,
        // Multer stores under OTHER; MedicalAttachment.type carries the clinical kind.
        MediaFileCategory.OTHER,
        uploadedByAccountId,
      );

      const attachment = await this.prisma.medicalAttachment.create({
        data: {
          encounterId,
          mediaFileId: media.id,
          type: dto.type,
          title: dto.title ?? file.originalname,
        },
        select: medicalAttachmentSelect(),
      });
      attachments.push(attachment);
    }

    return attachments.map((a) => this.encounterAdapter.adaptAttachment(a));
  }

  async removeAttachment(encounterId: number, attachmentId: number): Promise<void> {
    const attachment = await this.prisma.medicalAttachment.findFirst({
      where: { id: attachmentId, encounterId },
    });

    if (!attachment) {
      throw new NotFoundException();
    }

    await this.prisma.medicalAttachment.delete({ where: { id: attachmentId } });
    await this.mediaService.delete(attachment.mediaFileId);
  }
}
