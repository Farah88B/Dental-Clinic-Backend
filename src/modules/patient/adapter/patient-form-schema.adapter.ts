import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PatientFormSchemaResponseDto } from '../dto/patient-form-schema-response.dto';
import { RawPatientFormDefinition } from '../selectors/patient.select';

type Language = 'ar' | 'en';

interface FieldOption { value: string; labelAr: string; labelEn: string; isActive?: boolean; }

@Injectable()
export class PatientFormSchemaAdapter {
  async adapt(raw: RawPatientFormDefinition, language: Language): Promise<PatientFormSchemaResponseDto> {
    return new PatientFormSchemaResponseDto({
      key: raw.key,
      label: language === 'ar' ? raw.labelAr : raw.labelEn,
      type: raw.type,
      required: raw.required,
      validation: raw.validation as Record<string, unknown> | null,
      options: this.getActiveOptions(raw.options, language),
      displayOrder: raw.displayOrder,
    });
  }

  async fromArray(raws: RawPatientFormDefinition[], language: Language): Promise<PatientFormSchemaResponseDto[]> {
    return Promise.all(raws.map((raw) => this.adapt(raw, language)));
  }

  private getActiveOptions(options: Prisma.JsonValue | null, language: Language): { value: string; label: string }[] | null {
    if (!Array.isArray(options)) return null;
    return (options as unknown as FieldOption[])
      .filter((option) => option.isActive !== false)
      .map((option) => ({ value: option.value, label: language === 'ar' ? option.labelAr : option.labelEn }));
  }
}
