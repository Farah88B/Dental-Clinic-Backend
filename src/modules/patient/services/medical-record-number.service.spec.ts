import { MedicalRecordNumberService } from './medical-record-number.service';

describe('MedicalRecordNumberService', () => {
  it('uses the atomic counter value to create a readable sequential MRN', async () => {
    const tx = {
      medicalRecordNumberCounter: {
        upsert: jest.fn().mockResolvedValue({ lastValue: 42 }),
      },
    };
    const service = new MedicalRecordNumberService();

    await expect(service.generate(tx as never)).resolves.toBe('MRN000042');
    expect(tx.medicalRecordNumberCounter.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
      select: { lastValue: true },
    });
  });
});
