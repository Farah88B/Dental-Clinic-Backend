// Base type for domain-level exceptions derived from a raw Prisma error.
// These are framework-agnostic — PrismaHttpExceptionMapperService is the
// only place that knows how to turn them into HTTP exceptions.
export abstract class OrmExceptionBase extends Error {
  constructor(
    message: string,
    public readonly meta?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}