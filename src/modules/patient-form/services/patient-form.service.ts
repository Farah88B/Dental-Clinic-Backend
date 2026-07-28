import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PatientFormFieldType } from '@prisma/client';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PatientFormFieldAdapter } from '../adapter/patient-form-field.adapter';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { patientFormFieldSelect } from '../selectors/patient-form-field.select';
import { CreatePatientFormFieldDto } from '../dto/create-patient-form-field.dto';
import { UpdatePatientFormFieldDto } from '../dto/update-patient-form-field.dto';
import { TogglePatientFormFieldStatusDto } from '../dto/toggle-patient-form-field-status.dto';
import { ReorderPatientFormFieldsDto } from '../dto/reorder-patient-form-fields.dto';
import { PatientFormFieldResponseDto } from '../dto/patient-form-field-response.dto';

/**
 * Assumed shape for each entry inside the `options` Json column.
 * If your actual DTO shape differs, only this interface (and the two
 * helper methods below that use it) need to change.
 */
interface FieldOption {
  value: string;
  labelAr: string;
  labelEn: string;
  isActive: boolean;
}

const OPTION_BASED_TYPES: PatientFormFieldType[] = [
  PatientFormFieldType.RADIO,
  PatientFormFieldType.MULTI_SELECT,
];

export interface ListPatientFormFieldsFilters {
  isActive?: boolean;
  search?: string;
}

@Injectable()
export class PatientFormService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientFormFieldAdapter: PatientFormFieldAdapter,
  ) {}

  async list(
    pagination: PaginationDto,
    filters?: ListPatientFormFieldsFilters,
  ): Promise<AdminListDto<PatientFormFieldResponseDto>> {
    const where: Prisma.PatientFormFieldDefinitionWhereInput = {
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.search && {
        OR: [
          { labelAr: { contains: filters.search, mode: 'insensitive' } },
          { labelEn: { contains: filters.search, mode: 'insensitive' } },
          { key: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [fields, total] = await Promise.all([
      this.prisma.patientFormFieldDefinition.findMany({
        where,
        select: patientFormFieldSelect(),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.patientFormFieldDefinition.count({ where }),
    ]);

    const items = await this.patientFormFieldAdapter.fromArray(fields);
    return new AdminListDto(items, total);
  }

  async getById(id: number): Promise<PatientFormFieldResponseDto> {
    const field = await this.prisma.patientFormFieldDefinition.findUniqueOrThrow({
      where: { id },
      select: patientFormFieldSelect(),
    });

    return this.patientFormFieldAdapter.adapt(field);
  }

  async create(
    dto: CreatePatientFormFieldDto,
    createdByAccountId: number,
  ): Promise<PatientFormFieldResponseDto> {
    if (OPTION_BASED_TYPES.includes(dto.type) && !dto.options?.length) {
      throw new BadRequestException(
        `Options are required for field type "${dto.type}"`,
      );
    }

    const displayOrder = dto.displayOrder ?? (await this.getNextDisplayOrder());

    const normalizedOptions = dto.options
      ? this.normalizeNewOptions(dto.options)
      : undefined;

    const data: Prisma.PatientFormFieldDefinitionUncheckedCreateInput = {
      key: dto.key,
      labelAr: dto.labelAr,
      labelEn: dto.labelEn,
      type: dto.type,
      required: dto.required ?? false,
      displayOrder,
      createdById: createdByAccountId,
    };

    if (dto.validation !== undefined) {
      data.validation = dto.validation as Prisma.InputJsonValue;
    }

    if (normalizedOptions !== undefined) {
      data.options = normalizedOptions as unknown as Prisma.InputJsonValue;
    }

    const field = await this.prisma.patientFormFieldDefinition.create({
      data,
      select: patientFormFieldSelect(),
    });

    return this.patientFormFieldAdapter.adapt(field);
  }

  async update(
    id: number,
    dto: UpdatePatientFormFieldDto,
  ): Promise<PatientFormFieldResponseDto> {
    const existing = await this.prisma.patientFormFieldDefinition.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        key: true,
        type: true,
        options: true,
      },
    });

    // Guard: changing the type after patient data already exists would make
    // stored values inconsistent with the new expected shape (e.g. a stored
    // single string vs. an array expected by MULTI_SELECT). Force the caller
    // to create a new field + disable the old one instead.
    if (dto.type !== undefined && dto.type !== existing.type) {
      const usageCount = await this.prisma.patientFormFieldValue.count({
        where: { fieldDefinitionId: id },
      });

      if (usageCount > 0) {
        throw new ConflictException(
          `Cannot change the type of field "${existing.key}": ${usageCount} patient ` +
            `record(s) already reference it. Disable this field and create a new one instead.`,
        );
      }
    }

    if (
      dto.type !== undefined &&
      OPTION_BASED_TYPES.includes(dto.type) &&
      !dto.options?.length &&
      !this.hasOptions(existing.options)
    ) {
      throw new BadRequestException(
        `Options are required for field type "${dto.type}"`,
      );
    }

    // Guard: never hard-remove an option that was submitted before. A removed
    // option could still be the value stored for some patient. We soft-disable
    // anything missing from the new list instead of dropping it, so historical
    // data always resolves to a real (if inactive) option.
    const mergedOptions =
      dto.options !== undefined
        ? this.mergeOptions(existing.options, dto.options)
        : undefined;

    const data: Prisma.PatientFormFieldDefinitionUncheckedUpdateInput = {
      labelAr: dto.labelAr,
      labelEn: dto.labelEn,
      type: dto.type,
      required: dto.required,
      displayOrder: dto.displayOrder,
    };

    if (dto.validation !== undefined) {
      data.validation = dto.validation as Prisma.InputJsonValue;
    }

    if (mergedOptions !== undefined) {
      data.options = mergedOptions as unknown as Prisma.InputJsonValue;
    }

    const field = await this.prisma.patientFormFieldDefinition.update({
      where: { id },
      data,
      select: patientFormFieldSelect(),
    });

    return this.patientFormFieldAdapter.adapt(field);
  }

  async toggleStatus(
    id: number,
    dto: TogglePatientFormFieldStatusDto,
  ): Promise<PatientFormFieldResponseDto> {
    const field = await this.prisma.patientFormFieldDefinition.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: patientFormFieldSelect(),
    });

    return this.patientFormFieldAdapter.adapt(field);
  }

  async reorder(dto: ReorderPatientFormFieldsDto): Promise<PatientFormFieldResponseDto[]> {
    const ids = dto.fields.map((f) => f.id);
    const uniqueIds = new Set(ids);

    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException('Duplicate field ids in reorder payload');
    }

    const existing = await this.prisma.patientFormFieldDefinition.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (existing.length !== uniqueIds.size) {
      throw new BadRequestException('One or more field ids do not exist');
    }

    await this.prisma.$transaction(
      dto.fields.map((field) =>
        this.prisma.patientFormFieldDefinition.update({
          where: { id: field.id },
          data: { displayOrder: field.displayOrder },
        }),
      ),
    );

    const fields = await this.prisma.patientFormFieldDefinition.findMany({
      select: patientFormFieldSelect(),
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });

    return this.patientFormFieldAdapter.fromArray(fields);
  }

  private async getNextDisplayOrder(): Promise<number> {
    const last = await this.prisma.patientFormFieldDefinition.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    return (last?.displayOrder ?? 0) + 1;
  }

  private hasOptions(options: Prisma.JsonValue): boolean {
    return Array.isArray(options) && options.length > 0;
  }

  private normalizeNewOptions(options: unknown[]): FieldOption[] {
    return (options as Partial<FieldOption>[]).map((o) => ({
      value: o.value!,
      labelAr: o.labelAr!,
      labelEn: o.labelEn!,
      isActive: o.isActive ?? true,
    }));
  }

  /**
   * Merges a newly submitted options list with the previously stored one:
   * - Options present in both stay active and get their labels refreshed.
   * - Options that existed before but are absent from the new list are
   *   soft-disabled (isActive: false), never removed, so historical patient
   *   values that reference them remain valid and resolvable.
   * - Brand new options are appended as active.
   */
  private mergeOptions(
    existingOptions: Prisma.JsonValue,
    newOptions: unknown[],
  ): FieldOption[] {
    const oldArr = (Array.isArray(existingOptions) ? existingOptions : [])  as unknown as FieldOption[];
    const newArr = this.normalizeNewOptions(newOptions);

    const merged = oldArr.map((old) => {
      const match = newArr.find((n) => n.value === old.value);
      return match ? { ...old, ...match, isActive: true } : { ...old, isActive: false };
    });

    const brandNew = newArr.filter((n) => !oldArr.some((o) => o.value === n.value));

    return [...merged, ...brandNew];
  }
}