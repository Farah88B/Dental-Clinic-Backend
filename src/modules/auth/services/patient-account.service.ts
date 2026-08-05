import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { hashPassword } from 'src/common/utils/hash.utils';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { CreatePatientAccountDto } from '../dto/create-patient-account.dto';
import { RegeneratePatientPasswordResponseDto } from '../dto/regenerate-patient-password-response.dto';
import { AccountStatus } from '@prisma/client';

const PATIENT_ROLE_CODE = 'PATIENT';

@Injectable()
export class PatientAccountService {
  constructor(private readonly prisma: PrismaService) {}

  // Create an invited account for an existing patient and link it immediately.
  async createPatientAccount(patientId: number, dto: CreatePatientAccountDto) {
    const tempPassword = this.generateTempPassword();
    const password = await hashPassword(tempPassword);
    const patientRole = await this.prisma.role.findUniqueOrThrow({ where: { code: PATIENT_ROLE_CODE } });

    const account = await this.prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          phone: dto.phone,
          password,
          status: AccountStatus.INVITED,
          phoneVerifiedAt: new Date(),
        },
      });
      await tx.accountRole.create({ data: { accountId: created.id, roleId: patientRole.id } });
      await tx.patient.update({ where: { id: patientId }, data: { accountId: created.id } });
      return created;
    });

    return { accountId: account.id, phone: account.phone, tempPassword };
  }

  // Link or transfer a patient to an existing account by account id.
  async linkPatientAccount(patientId: number, accountId: number): Promise<void> {
    const patient = await this.prisma.patient.findUniqueOrThrow({ where: { id: patientId } });
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

    await this.prisma.patient.update({
      where: { id: patient.id },
      data: { accountId: account.id },
    });
  }

  // Regenerate the temporary password for an invited patient account.
  async regeneratePatientTempPassword(
    patientId: number,
  ): Promise<RegeneratePatientPasswordResponseDto> {
    const patient = await this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
      include: {
        account: true,
      },
    });

    if (!patient.accountId || !patient.account) {
      throw new ConflictException(ERROR_CODES.NOT_FOUND);
    }

    if (patient.account.status !== AccountStatus.INVITED) {
      throw new ConflictException(ERROR_CODES.INVALID_OPERATION);
    }

    const tempPassword = this.generateTempPassword();
    const password = await hashPassword(tempPassword);

    await this.prisma.account.update({
      where: { id: patient.account.id },
      data: { password },
    });

    return new RegeneratePatientPasswordResponseDto({
      accountId: patient.account.id,
      phone: patient.account.phone,
      tempPassword,
    });
  }

  // Generate the temporary password that the secretary shares with the patient.
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}