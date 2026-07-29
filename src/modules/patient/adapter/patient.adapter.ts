import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { PatientResponseDto } from '../dto/patient-response.dto';
import { RawPatient } from '../selectors/patient.select';

@Injectable()
export class PatientAdapter implements Adapter<PatientResponseDto, RawPatient> {
  async adapt(raw: RawPatient): Promise<PatientResponseDto> {
    return new PatientResponseDto({
      id: raw.id,
      medicalRecordNumber: raw.medicalRecordNumber,
      fullName: raw.fullName,
      birthDate: raw.birthDate,
      gender: raw.gender,
      status: raw.status,
      formValues: raw.formValues.map((formValue) => ({ key: formValue.fieldDefinition.key, value: formValue.value })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(raws: RawPatient[]): Promise<PatientResponseDto[]> {
    return Promise.all(raws.map((raw) => this.adapt(raw)));
  }
}
