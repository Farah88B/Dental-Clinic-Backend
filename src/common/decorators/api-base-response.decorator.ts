import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { BaseResponseDto } from '../dto/base-response.dto';

// Documents the REAL runtime shape produced by ResponseTransformInterceptor:
// { success: true, data: <Dto> } — not the bare Dto.
export const ApiBaseResponse = <T extends Type<unknown>>(dto: T, status = 200) =>
  applyDecorators(
    ApiExtraModels(BaseResponseDto, dto),
    ApiResponse({
      status,
      schema: {
        allOf: [
          { $ref: getSchemaPath(BaseResponseDto) },
          { properties: { data: { $ref: getSchemaPath(dto) } } },
        ],
      },
    }),
  );