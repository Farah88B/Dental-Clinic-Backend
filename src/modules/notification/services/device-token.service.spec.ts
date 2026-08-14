import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DevicePlatform } from '@prisma/client';
import { NOTIFICATION_ERROR_CODES } from 'src/common/constants/notification.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { DeviceTokenAdapter } from '../adapter/device-token.adapter';
import { DeviceTokenService } from './device-token.service';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;

  const prisma = {
    deviceToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const now = new Date('2026-08-14T10:00:00.000Z');

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DeviceTokenService,
        DeviceTokenAdapter,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(DeviceTokenService);
  });

  it('registers a new token', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue(null);
    prisma.deviceToken.create.mockResolvedValue({
      id: 1,
      accountId: 10,
      token: 'token-a',
      platform: DevicePlatform.ANDROID,
      userAgent: 'Flutter',
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.register(10, {
      token: 'token-a',
      platform: DevicePlatform.ANDROID,
      userAgent: 'Flutter',
    });

    expect(result.accountId).toBe(10);
    expect(result.platform).toBe(DevicePlatform.ANDROID);
    expect(prisma.deviceToken.create).toHaveBeenCalled();
  });

  it('updates metadata when the same account registers the same token again', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue({
      id: 1,
      accountId: 10,
      token: 'token-a',
      platform: DevicePlatform.ANDROID,
      userAgent: null,
      createdAt: now,
      updatedAt: now,
    });
    prisma.deviceToken.update.mockResolvedValue({
      id: 1,
      accountId: 10,
      token: 'token-a',
      platform: DevicePlatform.WEB,
      userAgent: 'Chrome',
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.register(10, {
      token: 'token-a',
      platform: DevicePlatform.WEB,
      userAgent: 'Chrome',
    });

    expect(result.platform).toBe(DevicePlatform.WEB);
    expect(prisma.deviceToken.create).not.toHaveBeenCalled();
  });

  it('reassigns a token from another account', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue({
      id: 1,
      accountId: 99,
      token: 'token-a',
      platform: DevicePlatform.ANDROID,
      userAgent: null,
      createdAt: now,
      updatedAt: now,
    });
    prisma.deviceToken.update.mockResolvedValue({
      id: 1,
      accountId: 10,
      token: 'token-a',
      platform: DevicePlatform.ANDROID,
      userAgent: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.register(10, {
      token: 'token-a',
      platform: DevicePlatform.ANDROID,
    });

    expect(result.accountId).toBe(10);
    expect(prisma.deviceToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountId: 10 }),
      }),
    );
  });

  it('rejects an empty token', async () => {
    await expect(
      service.register(10, { token: '   ', platform: DevicePlatform.IOS }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes own token', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue({
      id: 3,
      accountId: 10,
    });
    prisma.deviceToken.delete.mockResolvedValue({});

    await service.revoke(10, { token: 'token-a' });
    expect(prisma.deviceToken.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it('is idempotent when revoking a missing token', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue(null);
    await service.revoke(10, { token: 'missing' });
    expect(prisma.deviceToken.delete).not.toHaveBeenCalled();
  });

  it('cannot revoke another account token', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue({
      id: 3,
      accountId: 99,
    });

    await expect(service.revoke(10, { token: 'token-a' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.revoke(10, { token: 'token-a' })).rejects.toThrow(
      NOTIFICATION_ERROR_CODES.DEVICE_TOKEN_FORBIDDEN,
    );
  });
});
