// Subset of Prisma's known error codes that this app actively handles.
export enum PrismaErrorCode {
  UNIQUE_CONSTRAINT_VIOLATION = 'P2002',
  FOREIGN_KEY_CONSTRAINT_VIOLATION = 'P2003',
  RECORD_NOT_FOUND = 'P2025',
}