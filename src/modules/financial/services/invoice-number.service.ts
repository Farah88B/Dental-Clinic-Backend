import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvoiceNumberService {
  async generate(tx: Prisma.TransactionClient): Promise<string> {
    const counter = await tx.invoiceNumberCounter.upsert({
      where: { id: 1 },
      create: { id: 1, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
      select: { lastValue: true },
    });

    return `INV-${counter.lastValue.toString().padStart(6, '0')}`;
  }
}
