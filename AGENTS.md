# Dental-Clinic-Backend

## Stack
- NestJS v11 + TypeScript + PostgreSQL (Prisma ORM)
- JWT + Passport auth, RBAC via permissions
- Bilingual (Arabic/English) error messages
- Pino logger (pretty in dev), Helmet, Swagger, Throttler (100 req/min)

## Commands
| Command | What |
|---------|------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint + Prettier fix |
| `npm run test` | Jest unit tests (`*.spec.ts`) |
| `npm run test:e2e` | E2E tests (`test/*.e2e-spec.ts`) |
| `npm run test:cov` | Coverage |
| `npx prisma db seed` | Run seed (`prisma/seed/seed.ts`) |
| `npx prisma generate` | Generate Prisma client after schema change |

## Architecture

### API structure
All routes under `/api/v1/...` (URI versioning, default v1). Swagger at `/api/v1/docs`.

### Global response format
All responses wrapped as `{ success, statusCode, message, data }` by `ResponseTransformInterceptor`. Errors: `{ success: false, statusCode, message, error, details }`.

### Error pipeline
Prisma raw error → `PrismaErrorHandlerService` (domain exceptions) → `PrismaHttpExceptionMapperService` (HTTP exceptions) → `PrismaExceptionFilter` (bilingual response). Key Prisma codes: `P2002` (unique→409), `P2003` (FK→409 IN_USE_CANNOT_DELETE), `P2025` (not found→404).

### Auth (two-layer)
1. `JwtAuthGuard` — checks JWT bearer, skips if `@Public()` decorator present
2. `PermissionsGuard` — checks `@RequirePermission(...)` decorator, ALL must match
- JWT payload is `AuthenticatedAccount: { id, phone, preferredLanguage, roles: [{ id, permissions: string[] }] }`
- `@ReqUser(property?)` extracts authenticated user from request
- `@AuditAction(action)` marks endpoints for audit logging

### Key decorators
`@Public()`, `@RequirePermission(...)`, `@AuditAction(action)`, `@ReqUser()`, `@Match(property)`, `@PaginationQuery()`, `@HasPagination()`

### Prisma conventions
- Use `findUniqueOrThrow` for single-record lookups (no manual null checks — P2025 → 404)
- Use `findFirstOrThrow` for singleton rows (e.g., `ClinicSettings`)
- Adapter pattern: every module has an adapter to convert Prisma raw types → response DTOs
- Selectors defined as exported functions (e.g., `roleSelect()`, `patientSelect()`)

### Modules

| Module | Base path | Key endpoints |
|--------|-----------|---------------|
| Auth | `/api/v1/auth` | register, login, refresh, logout, forgot/reset password, change phone, biometric, invitations |
| Accounts | `/api/v1/accounts` | CRUD staff accounts (requires `manage_staff`) |
| AccountRoles | `/api/v1/accounts/:accountId/roles` | Assign/revoke roles (additive, last-DOCTOR protection) |
| Roles | `/api/v1/roles` | CRUD roles + assign permissions (requires `manage_roles`) |
| Permissions | `/api/v1/permissions` | List all permissions (read-only, requires `manage_roles`) |
| Patient | `/api/v1/patients`, `/api/v1/dashboard/patients` | Create patient (app/dashboard), get form schema |
| PatientForm | `/api/v1/patient-form-fields` | CRUD + reorder form fields (requires `manage_patient_form_fields`) |
| ClinicSettings | `/api/v1/clinic-settings` | Get/update singleton settings (update requires `manage_clinic_settings`) |
| Health | `/api/v1/health` | DB ping check (public) |

### Key business rules
- Last active DOCTOR cannot be disabled or have DOCTOR role revoked
- Account statuses: `PENDING_ACTIVATION` → (OTP verify) → `ACTIVE`; `INVITED` → (activation) → `ACTIVE`
- SMS in stub mode by default (logs instead of sending, static OTP: `123456`)
- `MedicalRecordNumberCounter` generates incremental MRNs (`MRN000001`)

## Setup
1. Copy `.env.example` to `.env`, configure `DATABASE_URL` (PostgreSQL)
2. `npm install`
3. `npx prisma generate && npx prisma db push && npx prisma db seed`
4. `npm run start:dev`
- Seed creates: 30 permissions, 3 roles (DOCTOR/SECRETARY/PATIENT), 1 DOCTOR account (phone: `0999999999`, password: `12345678`)
