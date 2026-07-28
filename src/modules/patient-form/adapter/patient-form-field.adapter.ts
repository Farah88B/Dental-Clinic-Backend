import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { PatientFormFieldResponseDto } from '../dto/patient-form-field-response.dto';
import { RawPatientFormFieldSelect } from '../selectors/patient-form-field.select';

/**
 * 'admin'   -> full options list (active + soft-disabled), used by the dashboard
 *              so staff can see and re-enable previously disabled options.
 * 'patient' -> active options only, used anywhere a patient fills or views
 *              their own form (empty schema or their submitted values).
 */
export type PatientFormFieldAdapterContext = 'admin' | 'patient';

@Injectable()
export class PatientFormFieldAdapter
  implements Adapter<PatientFormFieldResponseDto, RawPatientFormFieldSelect>
{
  async adapt(
    raw: RawPatientFormFieldSelect,
    context: PatientFormFieldAdapterContext = 'admin',
  ): Promise<PatientFormFieldResponseDto> {
    return new PatientFormFieldResponseDto({
      id: raw.id,
      key: raw.key,
      labelAr: raw.labelAr,
      labelEn: raw.labelEn,
      type: raw.type,
      required: raw.required,
      validation: raw.validation as Record<string, unknown> | null,
      options:
        context === 'patient'
          ? (this.filterActiveOptions(raw.options as Prisma.JsonValue | null) as unknown[] | null)
          : (raw.options as unknown[] | null),
      displayOrder: raw.displayOrder,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(
    raws: RawPatientFormFieldSelect[],
    context: PatientFormFieldAdapterContext = 'admin',
  ): Promise<PatientFormFieldResponseDto[]> {
    return Promise.all(raws.map((raw) => this.adapt(raw, context)));
  }

  /**
   * Keeps only options that are still active (isActive !== false). Anything
   * that isn't a well-formed option object (unexpected/legacy shape) is left
   * as-is rather than silently dropped, since dropping unknown shapes could
   * hide a real, currently-selected value from the patient's own view.
   */
  private filterActiveOptions(
    options: Prisma.JsonValue | null,
  ): Prisma.JsonValue | null {
    if (!Array.isArray(options)) {
      return options;
    }

    return options.filter((option) => {
      if (typeof option !== 'object' || option === null || Array.isArray(option)) {
        return true;
      }
      return (option as Record<string, unknown>).isActive !== false;
    });
  }
}