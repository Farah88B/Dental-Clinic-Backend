import { BadRequestException, Injectable } from '@nestjs/common';
import { PatientFormFieldType, Prisma } from '@prisma/client';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { CreatePatientFormValueDto } from '../dto/create-patient.dto';
import { RawPatientFormDefinition } from '../selectors/patient.select';

interface FieldOption {
  value: string;
  isActive?: boolean;
}

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number | string;
  max?: number | string;
  integer?: boolean;
  minItems?: number;
  maxItems?: number;
}

export interface ValidatedPatientFormValue {
  fieldDefinitionId: number;
  value: Prisma.InputJsonValue;
}

@Injectable()
export class PatientFormValidationService {
  validate(
    values: CreatePatientFormValueDto[],
    definitions: RawPatientFormDefinition[],
  ): ValidatedPatientFormValue[] {
    const definitionsByKey = new Map(
      definitions.map((definition) => [definition.key, definition]),
    );
    const submittedKeys = new Set<string>();

    for (const submitted of values) {
      if (submittedKeys.has(submitted.key)) {
        throw new BadRequestException(
          ERROR_CODES.PATIENT_FORM_DUPLICATE_FIELD_VALUE,
        );
      }
      submittedKeys.add(submitted.key);

      const definition = definitionsByKey.get(submitted.key);
      if (!definition) {
        throw new BadRequestException(ERROR_CODES.PATIENT_FORM_UNKNOWN_FIELD);
      }
      if (!definition.isActive) {
        throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INACTIVE_FIELD);
      }

      this.validateFieldValue(definition, submitted.value);
    }

    for (const definition of definitions) {
      if (
        definition.isActive &&
        definition.required &&
        !submittedKeys.has(definition.key)
      ) {
        throw new BadRequestException(ERROR_CODES.PATIENT_FORM_REQUIRED_FIELD);
      }
    }

    return values.map((submitted) => ({
      fieldDefinitionId: definitionsByKey.get(submitted.key)!.id,
      value: submitted.value as Prisma.InputJsonValue,
    }));
  }

  private validateFieldValue(
    definition: RawPatientFormDefinition,
    value: unknown,
  ): void {
    if (this.isEmpty(value)) {
      if (definition.required) {
        throw new BadRequestException(ERROR_CODES.PATIENT_FORM_REQUIRED_FIELD);
      }
      throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
    }

    switch (definition.type) {
      case PatientFormFieldType.TEXT:
      case PatientFormFieldType.TEXTAREA:
        if (typeof value !== 'string') {
          throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
        }
        this.validateTextRules(value, definition.validation);
        return;
      case PatientFormFieldType.NUMBER:
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
        }
        this.validateNumberRules(value, definition.validation);
        return;
      case PatientFormFieldType.DATE:
        if (!this.isValidDate(value)) {
          throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
        }
        this.validateDateRules(value, definition.validation);
        return;
      case PatientFormFieldType.RADIO:
        if (typeof value !== 'string') {
          throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
        }
        this.validateOption(value, definition.options);
        return;
      case PatientFormFieldType.MULTI_SELECT:
        if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
          throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
        }
        if (new Set(value).size !== value.length) {
          throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
        }
        this.validateArrayRules(value, definition.validation);
        value.forEach((option) => this.validateOption(option, definition.options));
        return;
    }
  }

  private validateOption(value: string, options: Prisma.JsonValue | null): void {
    const option = this.getOptions(options).find((item) => item.value === value);
    if (!option) {
      throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
    }
    if (option.isActive === false) {
      throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INACTIVE_OPTION);
    }
  }

  private validateTextRules(value: string, validation: Prisma.JsonValue | null): void {
    const rules = this.getValidation(validation);
    if (
      (typeof rules.minLength === 'number' && value.length < rules.minLength) ||
      (typeof rules.maxLength === 'number' && value.length > rules.maxLength) ||
      (typeof rules.pattern === 'string' && !new RegExp(rules.pattern).test(value))
    ) {
      throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
    }
  }

  private validateNumberRules(value: number, validation: Prisma.JsonValue | null): void {
    const rules = this.getValidation(validation);
    if (
      (typeof rules.min === 'number' && value < rules.min) ||
      (typeof rules.max === 'number' && value > rules.max) ||
      (rules.integer === true && !Number.isInteger(value))
    ) {
      throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
    }
  }

  private validateDateRules(value: string, validation: Prisma.JsonValue | null): void {
    const rules = this.getValidation(validation);
    if (
      (typeof rules.min === 'string' && value < rules.min) ||
      (typeof rules.max === 'string' && value > rules.max)
    ) {
      throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
    }
  }

  private validateArrayRules(value: string[], validation: Prisma.JsonValue | null): void {
    const rules = this.getValidation(validation);
    if (
      (typeof rules.minItems === 'number' && value.length < rules.minItems) ||
      (typeof rules.maxItems === 'number' && value.length > rules.maxItems)
    ) {
      throw new BadRequestException(ERROR_CODES.PATIENT_FORM_INVALID_VALUE);
    }
  }

  private getOptions(options: Prisma.JsonValue | null): FieldOption[] {
    return Array.isArray(options) ? (options as unknown as FieldOption[]) : [];
  }

  private getValidation(validation: Prisma.JsonValue | null): FieldValidation {
    return validation && typeof validation === 'object' && !Array.isArray(validation)
      ? (validation as FieldValidation)
      : {};
  }

  private isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  }

  private isValidDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
}
