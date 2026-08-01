import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { buildPublicMediaUrl } from 'src/common/media/helpers/media-path.helper';
import { PatientResponseDto } from '../dto/patient-response.dto';
import { PatientMyResponseDto } from '../dto/patient-my-response.dto';
import { PatientDetailResponseDto } from '../dto/patient-detail-response.dto';
import { PatientListResponseDto } from '../dto/patient-list-response.dto';
import {
  RawPatient,
  RawPatientMy,
  RawPatientDetail,
  RawPatientList,
} from '../selectors/patient.select';

type Language = 'ar' | 'en';

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
      formValues: raw.formValues.map((formValue) => ({
        key: formValue.fieldDefinition.key,
        value: formValue.value,
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(raws: RawPatient[]): Promise<PatientResponseDto[]> {
    return Promise.all(raws.map((raw) => this.adapt(raw)));
  }

  adaptMy(raw: RawPatientMy): PatientMyResponseDto {
    return new PatientMyResponseDto({
      id: raw.id,
      medicalRecordNumber: raw.medicalRecordNumber,
      fullName: raw.fullName,
      birthDate: raw.birthDate,
      gender: raw.gender,
      status: raw.status,
      profileImage: raw.profileImage
        ? {
            id: raw.profileImage.id,
            url: buildPublicMediaUrl(raw.profileImage.path),
          }
        : null,
    });
  }

  fromArrayMy(raws: RawPatientMy[]): PatientMyResponseDto[] {
    return raws.map((raw) => this.adaptMy(raw));
  }

  adaptDetail(
    raw: RawPatientDetail,
    language: Language,
    includeAccount: boolean,
  ): PatientDetailResponseDto {
    return new PatientDetailResponseDto({
      id: raw.id,
      medicalRecordNumber: raw.medicalRecordNumber,
      fullName: raw.fullName,
      birthDate: raw.birthDate,
      gender: raw.gender,
      status: raw.status,
      lastVisitAt: raw.lastVisitAt,
      profileImage: raw.profileImage
        ? {
            id: raw.profileImage.id,
            url: buildPublicMediaUrl(raw.profileImage.path),
          }
        : null,
      account:
        includeAccount && raw.account
          ? {
              id: raw.account.id,
              phone: raw.account.phone,
              status: raw.account.status,
            }
          : null,
      formValues: raw.formValues.map((fv) => ({
        key: fv.fieldDefinition.key,
        label:
          language === 'ar'
            ? fv.fieldDefinition.labelAr
            : fv.fieldDefinition.labelEn,
        type: fv.fieldDefinition.type,
        value: fv.value,
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  adaptList(raw: RawPatientList): PatientListResponseDto {
    return new PatientListResponseDto({
      id: raw.id,
      medicalRecordNumber: raw.medicalRecordNumber,
      fullName: raw.fullName,
      phone: raw.account?.phone ?? null,
      birthDate: raw.birthDate,
      gender: raw.gender,
      status: raw.status,
      lastVisitAt: raw.lastVisitAt,
      profileImage: raw.profileImage
        ? {
            id: raw.profileImage.id,
            url: buildPublicMediaUrl(raw.profileImage.path),
          }
        : null,
      accountId: raw.accountId,
    });
  }

  fromArrayList(raws: RawPatientList[]): PatientListResponseDto[] {
    return raws.map((raw) => this.adaptList(raw));
  }
}
