import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { ProfileImageDto } from 'src/modules/patient/dto/patient-my-response.dto';

export class InvoicePatientSummaryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  medicalRecordNumber!: string;

  @ApiProperty({ type: ProfileImageDto, nullable: true })
  profileImage!: ProfileImageDto | null;

  constructor(partial: Partial<InvoicePatientSummaryDto>) {
    Object.assign(this, partial);
  }
}

export class InvoiceItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  descriptionAr!: string | null;

  @ApiPropertyOptional({ nullable: true })
  descriptionEn!: string | null;

  @ApiProperty()
  quantity!: string;

  @ApiProperty()
  unitPrice!: string;

  @ApiProperty()
  totalAmount!: string;

  constructor(partial: Partial<InvoiceItemResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PaymentResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  invoiceId!: number;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty()
  receivedByAccountId!: number;

  @ApiProperty()
  paidAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  constructor(partial: Partial<PaymentResponseDto>) {
    Object.assign(this, partial);
  }
}

export class InvoiceListItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  patientId!: number;

  @ApiPropertyOptional({ nullable: true })
  treatmentPlanId!: number | null;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  paidAmount!: string;

  @ApiProperty()
  remainingAmount!: string;

  @ApiProperty()
  issuedAt!: Date;

  @ApiPropertyOptional({ type: InvoicePatientSummaryDto })
  patient?: InvoicePatientSummaryDto;

  @ApiProperty({ type: [PaymentResponseDto] })
  payments!: PaymentResponseDto[];

  constructor(partial: Partial<InvoiceListItemDto>) {
    Object.assign(this, partial);
  }
}

export class InvoiceDetailResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  patientId!: number;

  @ApiPropertyOptional({ nullable: true })
  treatmentPlanId!: number | null;

  @ApiPropertyOptional({ nullable: true })
  createdByAccountId!: number | null;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  paidAmount!: string;

  @ApiProperty()
  remainingAmount!: string;

  @ApiProperty()
  issuedAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: InvoicePatientSummaryDto })
  patient!: InvoicePatientSummaryDto;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items!: InvoiceItemResponseDto[];

  @ApiProperty({ type: [PaymentResponseDto] })
  payments!: PaymentResponseDto[];

  constructor(partial: Partial<InvoiceDetailResponseDto>) {
    Object.assign(this, partial);
  }
}

export class InvoiceListSummaryDto {
  @ApiProperty({ description: 'Sum of invoice totals for the filtered set' })
  totalBilled!: string;

  @ApiProperty()
  totalPaid!: string;

  @ApiProperty()
  totalRemaining!: string;

  constructor(partial: Partial<InvoiceListSummaryDto>) {
    Object.assign(this, partial);
  }
}

export class InvoiceListResponseDto {
  @ApiProperty({ type: [InvoiceListItemDto] })
  items!: InvoiceListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: InvoiceListSummaryDto })
  summary!: InvoiceListSummaryDto;

  constructor(
    items: InvoiceListItemDto[],
    total: number,
    summary: InvoiceListSummaryDto,
  ) {
    this.items = items;
    this.total = total;
    this.summary = summary;
  }
}

export class PaymentListResponseDto extends AdminListDto<PaymentResponseDto> {
  @ApiProperty({ type: [PaymentResponseDto] })
  declare items: PaymentResponseDto[];
}

export class FinancialSummaryPatientDto {
  @ApiProperty()
  patientId!: number;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  medicalRecordNumber!: string;

  @ApiProperty()
  totalBilled!: string;

  @ApiProperty()
  totalPaid!: string;

  @ApiProperty()
  totalRemaining!: string;

  @ApiProperty({ type: [InvoiceListItemDto] })
  invoices!: InvoiceListItemDto[];

  constructor(partial: Partial<FinancialSummaryPatientDto>) {
    Object.assign(this, partial);
  }
}

export class FinancialSummaryResponseDto {
  @ApiProperty({ enum: ['PATIENT', 'FAMILY'] })
  scope!: 'PATIENT' | 'FAMILY';

  @ApiProperty()
  totalBilled!: string;

  @ApiProperty()
  totalPaid!: string;

  @ApiProperty()
  totalRemaining!: string;

  @ApiProperty({ type: [FinancialSummaryPatientDto] })
  patients!: FinancialSummaryPatientDto[];

  constructor(partial: Partial<FinancialSummaryResponseDto>) {
    Object.assign(this, partial);
  }
}

export class AccountStatementResponseDto {
  @ApiProperty()
  totalBilled!: string;

  @ApiProperty()
  totalPaid!: string;

  @ApiProperty()
  totalRemaining!: string;

  @ApiProperty({ type: [InvoiceListItemDto] })
  invoices!: InvoiceListItemDto[];

  constructor(partial: Partial<AccountStatementResponseDto>) {
    Object.assign(this, partial);
  }
}
