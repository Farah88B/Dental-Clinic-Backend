import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

export function writeErrorResponse(
  response: Response,
  statusCode: number,
  message: string,
  error: string,
  details: unknown = null,
): void {
  const errorResponse: ErrorResponseDto = {
    success: false,
    statusCode,
    message,
    error,
    details: details ?? null,
  };

  response.status(statusCode).json(errorResponse);
}
