// common/decorators/api-base-union-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { BaseResponseDto } from '../dto/base-response.dto';

// Documents { success, data: A | B | ... } — for endpoints whose response
// shape genuinely differs by business state (login() returns TokenPairDto
// for ACTIVE accounts, ActivationRequiredDto for INVITED ones).
export const ApiBaseUnionResponse = (...dtos: Type<unknown>[]) =>
  applyDecorators(
    ApiExtraModels(BaseResponseDto, ...dtos),
    ApiResponse({
      status: 200,
      schema: {
        allOf: [
          { $ref: getSchemaPath(BaseResponseDto) },
          { properties: { data: { oneOf: dtos.map((dto) => ({ $ref: getSchemaPath(dto) })) } } },
        ],
      },
    }),
  );