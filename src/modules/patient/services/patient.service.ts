import { ConflictException, Injectable } from '@nestjs/common';
import { Patient, Prisma } from '@prisma/client';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PatientAdapter } from '../adapter/patient.adapter';
import { PatientFormSchemaAdapter } from '../adapter/patient-form-schema.adapter';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { PatientFormSchemaResponseDto } from '../dto/patient-form-schema-response.dto';
import { PatientResponseDto } from '../dto/patient-response.dto';
import { patientFormDefinitionSelect, patientSelect, RawPatientFormDefinition } from '../selectors/patient.select';
import { MedicalRecordNumberService } from './medical-record-number.service';
import { PatientFormValidationService } from './patient-form-validation.service';

type Language = 'ar' | 'en';

export interface CreatePatientContext {
  source: 'APP' | 'DASHBOARD';
  accountId: number | null;
  authenticatedAccountId: number;
  allowDuplicateCreation: boolean;
}

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAdapter: PatientAdapter,
    private readonly patientFormSchemaAdapter: PatientFormSchemaAdapter,
    private readonly patientFormValidationService: PatientFormValidationService,
    private readonly medicalRecordNumberService: MedicalRecordNumberService,
  ) {}

  async getFormSchema(language: Language): Promise<PatientFormSchemaResponseDto[]> {
    const definitions = await this.prisma.patientFormFieldDefinition.findMany({
      where: { isActive: true },
      select: patientFormDefinitionSelect(),
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });

    return this.patientFormSchemaAdapter.fromArray(definitions, language);
  }

  async create(dto: CreatePatientDto, context: CreatePatientContext): Promise<PatientResponseDto> {
    const patient = await this.prisma.$transaction(async (tx) => {
      const definitions = await this.loadFieldDefinitions(tx);
      const formValues = this.patientFormValidationService.validate(dto.formValues ?? [], definitions);
      const duplicatePatients = await this.findDuplicatePatients(tx, dto);

      if (duplicatePatients.length && !context.allowDuplicateCreation) {
        this.throwDuplicatePatientException(duplicatePatients, context.source);
      }

      const medicalRecordNumber = await this.medicalRecordNumberService.generate(tx);

      return tx.patient.create({
        data: {
          accountId: context.accountId,
          createdById: context.authenticatedAccountId,
          fullName: dto.fullName,
          birthDate: dto.birthDate,
          gender: dto.gender,
          medicalRecordNumber,
          status: 'ACTIVE',
          formValues: {
            create: formValues.map((formValue) => ({
              fieldDefinitionId: formValue.fieldDefinitionId,
              value: formValue.value,
              updatedByAccountId: context.authenticatedAccountId,
            })),
          },
        },
        select: patientSelect(),
      });
    });

    return this.patientAdapter.adapt(patient);
  }

  async findDuplicatePatients(
    tx: Prisma.TransactionClient,
    dto: Pick<CreatePatientDto, 'fullName' | 'birthDate' | 'gender'>,
  ): Promise<Patient[]> {
    return tx.patient.findMany({
      where: { fullName: dto.fullName, birthDate: dto.birthDate, gender: dto.gender },
    });
  }

  private throwDuplicatePatientException(duplicatePatients: Patient[], source: CreatePatientContext['source']): never {
    if (source === 'APP') {
      throw new ConflictException(ERROR_CODES.PATIENT_DUPLICATE);
    }

    throw new ConflictException({
      message: ERROR_CODES.PATIENT_DUPLICATE,
      details: {
        duplicatePatients: duplicatePatients.map((patient) => ({
          id: patient.id,
          medicalRecordNumber: patient.medicalRecordNumber,
          fullName: patient.fullName,
          birthDate: patient.birthDate,
          gender: patient.gender,
          accountId: patient.accountId,
          status: patient.status,
        })),
      },
    });
  }

  private async loadFieldDefinitions(tx: Prisma.TransactionClient): Promise<RawPatientFormDefinition[]> {
    return tx.patientFormFieldDefinition.findMany({ select: patientFormDefinitionSelect() });
  }
}
