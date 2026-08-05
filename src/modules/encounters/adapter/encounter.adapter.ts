import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import {
  EncounterResponseDto,
  MedicalAttachmentResponseDto,
} from '../dto/encounter-response.dto';
import {
  RawEncounterSelect,
  RawMedicalAttachmentSelect,
} from '../selectors/encounter.select';

@Injectable()
export class EncounterAdapter
  implements Adapter<EncounterResponseDto, RawEncounterSelect>
{
  async adapt(raw: RawEncounterSelect): Promise<EncounterResponseDto> {
    return new EncounterResponseDto({
      id: raw.id,
      treatmentSessionId: raw.treatmentSessionId,
      appointmentId: raw.appointmentId,
      status: raw.status,
      diagnosis: raw.diagnosis,
      clinicalNotes: raw.clinicalNotes,
      teeth: Array.isArray(raw.teeth) ? raw.teeth : [],
      prescription: raw.prescription,
      attachments: raw.attachments.map((a) => this.adaptAttachment(a)),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  adaptAttachment(raw: RawMedicalAttachmentSelect): MedicalAttachmentResponseDto {
    return new MedicalAttachmentResponseDto({
      id: raw.id,
      encounterId: raw.encounterId,
      mediaFileId: raw.mediaFileId,
      type: raw.type,
      title: raw.title,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(raws: RawEncounterSelect[]): Promise<EncounterResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r)));
  }
}
