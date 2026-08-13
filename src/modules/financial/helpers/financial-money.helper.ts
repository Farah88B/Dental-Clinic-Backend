import { InvoiceStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export function moneyString(value: Prisma.Decimal | number | string): string {
  return new Prisma.Decimal(value).toFixed(2);
}

export function sumAmounts(
  amounts: Array<Prisma.Decimal | number | string>,
): Prisma.Decimal {
  return amounts.reduce<Prisma.Decimal>(
    (sum, amount) => sum.add(new Prisma.Decimal(amount)),
    new Prisma.Decimal(0),
  );
}

export function deriveInvoiceStatus(
  totalAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
): InvoiceStatus {
  if (paidAmount.lte(0)) {
    return InvoiceStatus.UNPAID;
  }
  if (paidAmount.gte(totalAmount)) {
    return InvoiceStatus.PAID;
  }
  return InvoiceStatus.PARTIALLY_PAID;
}
