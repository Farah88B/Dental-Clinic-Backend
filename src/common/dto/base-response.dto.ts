/**
 * Standard structure for all successful API responses.
 */
import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
  @ApiProperty({
    example: true,
  })
  success!: boolean;


  @ApiProperty({
    example: 200,
  })
  statusCode!: number;


  @ApiProperty({
    example: 'Operation completed successfully',
  })
  message!: string;


  @ApiProperty()
  data!: T;
}