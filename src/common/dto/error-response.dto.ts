import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents the standard structure for all failed API responses.
 */
export class ErrorResponseDto {

  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 'Validation failed.' })
  message!: string;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    nullable: true,
    example: [
      {
        message: 'phone must be a valid phone number',
      },
    ],
  })
  details!: unknown | null;
}