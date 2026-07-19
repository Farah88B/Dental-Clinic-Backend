import { Test } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ERROR_CODES } from '../constants/error-codes.constants';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const makeContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        Reflector,
      ],
    }).compile();

    guard = moduleRef.get(PermissionsGuard);
    reflector = moduleRef.get(Reflector);
  });


  it('allows the request when the endpoint requires no permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined);

    expect(
      guard.canActivate(makeContext(undefined)),
    ).toBe(true);
  });


  it('allows the request when the account holds the required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['manage_roles']);

    const user = {
      id: 1,
      roles: [
        {
          id: 1,
          permissions: [
            'manage_roles',
            'manage_staff',
          ],
        },
      ],
    };

    expect(
      guard.canActivate(makeContext(user)),
    ).toBe(true);
  });


  it('throws ForbiddenException when the account lacks the required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['manage_roles']);

    const user = {
      id: 1,
      roles: [
        {
          id: 2,
          permissions: [
            'view_patients',
          ],
        },
      ],
    };


    try {
      guard.canActivate(makeContext(user));
    } catch (e) {

      expect(e).toBeInstanceOf(ForbiddenException);

     expect(e.getResponse()).toEqual({
  code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
});
    }

  });


  it('throws ForbiddenException when there is no authenticated account at all', () => {

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['manage_roles']);


    expect(() =>
      guard.canActivate(
        makeContext(undefined),
      ),
    ).toThrow(ForbiddenException);

  });


  it('requires ALL listed permissions when more than one is specified', () => {

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([
        'manage_roles',
        'manage_staff',
      ]);


    const user = {
      id: 1,
      roles: [
        {
          id: 1,
          permissions: [
            'manage_roles',
          ],
        },
      ],
    };


  try {
  guard.canActivate(makeContext(user));
} catch (e) {

  expect(e).toBeInstanceOf(ForbiddenException);

  expect(e.getResponse()).toEqual({
    code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
  });

}

  });

});