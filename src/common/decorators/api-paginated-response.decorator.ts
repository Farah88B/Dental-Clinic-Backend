import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { BaseResponseDto } from '../dto/base-response.dto';
import { AdminListDto } from '../admin/admin-list.dto';

// Same idea as ApiBaseResponse, but for list endpoints returning
// { success, data: { items: <Dto>[], total } }.
export const ApiPaginatedResponse = <T extends Type<unknown>>(dto: T) =>
  applyDecorators(
    ApiExtraModels(BaseResponseDto, AdminListDto, dto),
    ApiResponse({
      status: 200,
      schema: {
        allOf: [
          { $ref: getSchemaPath(BaseResponseDto) },
          {
            properties: {
              data: {
                allOf: [
                  { $ref: getSchemaPath(AdminListDto) },
                  { properties: { items: { type: 'array', items: { $ref: getSchemaPath(dto) } } } },
                ],
              },
            },
          },
        ],
      },
    }),
  );