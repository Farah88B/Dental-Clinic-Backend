import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  MediaFileCategory,
  MedicalAttachmentType,
  TreatmentSessionStatus,
} from '@prisma/client';
import { buildPublicMediaUrl } from 'src/common/media/helpers/media-path.helper';
import {
  pickLocalized,
  toUiLanguage,
  UiLanguage,
} from 'src/common/i18n/localize.helper';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { RateTreatmentSessionDto } from '../dto/rate-treatment-session.dto';
import {
  PatientMedicalArchiveType,
  PatientPlanListStatus,
  PatientSessionFileType,
  PatientSessionListStatus,
} from '../dto/patient-treatment-query.dto';
import {
  patientTreatmentMediaFileSelect,
  patientTreatmentPlanDetailSelect,
  patientTreatmentPlanSessionFilesSelect,
  patientTreatmentPlanSummarySelect,
  patientTreatmentSessionListSelect,
} from '../selectors/patient-treatment.select';
import { TreatmentSessionsService } from './treatment-sessions.service';
import {
  PatientMedicalArchiveItemResponseDto,
  PatientMedicalArchivePlanResponseDto,
  PatientMedicalArchiveSessionResponseDto,
  PatientMedicalAttachmentResponseDto,
  PatientPlanSessionFilesResponseDto,
  PatientPlanSessionResponseDto,
  PatientSessionPendingRatingResponseDto,
  PatientTreatmentEncounterResponseDto,
  PatientTreatmentMediaFileResponseDto,
  PatientTreatmentPlanDetailResponseDto,
  PatientTreatmentPlanResponseDto,
  PatientTreatmentSessionResponseDto,
} from '../dto/patient-treatment-response.dto';
import {
  PatientHomeResponseDto,
  PendingRatingWithSessionDto,
} from '../dto/patient-home-response.dto';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  computeCanBook,
  computeCanTreat,
  SessionOrderStatus,
} from '../helpers/session-flags.helper';

type PatientMediaFile = {
  id: number;
  path: string;
  originalName: string;
  mimeType: string;
  category: MediaFileCategory;
};

type PatientAttachment = {
  id: number;
  type: MedicalAttachmentType;
  title: string | null;
  createdAt: Date;
  mediaFile: PatientMediaFile;
};

type PatientSessionPendingRating = {
  treatmentSessionId: number;
  canRateUntil: string;
} | null;

type SessionAppointment = {
  id: number;
  status: AppointmentStatus;
  createdAt: Date;
};

type SessionProgressInput = { status: TreatmentSessionStatus };

/** Patient app: ownership check. Staff dashboard: patient must exist. */
export type PatientTreatmentAccess =
  | { kind: 'patient'; accountId: number }
  | { kind: 'staff' };

const ESTIMATED_COST_VISIBLE_STATUSES: ReadonlySet<TreatmentSessionStatus> =
  new Set([
    TreatmentSessionStatus.PENDING,
    TreatmentSessionStatus.BOOKED,
  ]);

@Injectable()
export class PatientTreatmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly treatmentSessionsService: TreatmentSessionsService,
  ) {}

  async listPlans(
    patientId: number,
    access: PatientTreatmentAccess,
    preferredLanguage?: string,
    status?: PatientPlanListStatus,
  ): Promise<PatientTreatmentPlanResponseDto[]> {
    const language = toUiLanguage(preferredLanguage);
    await this.assertPatientAccess(patientId, access);

    const plans = await this.prisma.treatmentPlan.findMany({
      where: {
        patientId,
        ...(status !== undefined && { status }),
      },
      select: patientTreatmentPlanSummarySelect(),
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((plan) => this.mapPlanSummary(plan, language));
  }

  async getPlan(
    patientId: number,
    planId: number,
    accountId: number,
    preferredLanguage?: string,
  ): Promise<PatientTreatmentPlanDetailResponseDto> {
    const language = toUiLanguage(preferredLanguage);
    await this.assertOwnedPatient(patientId, accountId);

    const [pendingRating, plan] = await Promise.all([
      this.treatmentSessionsService.findPendingRatingSummaryForPatient(patientId),
      this.prisma.treatmentPlan.findFirstOrThrow({
        where: { id: planId, patientId },
        select: patientTreatmentPlanDetailSelect(),
      }),
    ]);

    const summary = this.mapPlanSummary(plan, language);

    return new PatientTreatmentPlanDetailResponseDto({
      ...summary,
      sessions: plan.sessions.map(
        (session) =>
          new PatientPlanSessionResponseDto(
            this.mapSessionFields(
              session,
              language,
              pendingRating,
              plan.sessions,
            ),
          ),
      ),
    });
  }

  async listSessions(
    patientId: number,
    access: PatientTreatmentAccess,
    status: PatientSessionListStatus,
    preferredLanguage?: string,
  ): Promise<PatientTreatmentSessionResponseDto[]> {
    const language = toUiLanguage(preferredLanguage);
    await this.assertPatientAccess(patientId, access);

    const pendingRatingPromise =
      status === TreatmentSessionStatus.COMPLETED
        ? this.treatmentSessionsService.findPendingRatingSummaryForPatient(
            patientId,
          )
        : Promise.resolve(null);

    const [pendingRating, sessions] = await Promise.all([
      pendingRatingPromise,
      this.prisma.treatmentSession.findMany({
        where: {
          treatmentPlan: { patientId },
          status,
        },
        select: patientTreatmentSessionListSelect(),
        orderBy:
          status === TreatmentSessionStatus.COMPLETED
            ? { completedAt: 'desc' }
            : [{ treatmentPlanId: 'asc' }, { sessionOrder: 'asc' }],
      }),
    ]);

    return sessions.map(
      (session) =>
        new PatientTreatmentSessionResponseDto({
          ...this.mapSessionFields(
            session,
            language,
            pendingRating,
            session.treatmentPlan.sessions,
          ),
          treatmentPlanId: session.treatmentPlanId,
          planName: this.resolvePlanName(session.treatmentPlan, language),
        }),
    );
  }

  /**
   * Sessions candidates for booking: PENDING only; use canBook for the button.
   */
  async listSessionsForBooking(
    patientId: number,
    access: PatientTreatmentAccess,
    preferredLanguage?: string,
  ): Promise<PatientTreatmentSessionResponseDto[]> {
    const language = toUiLanguage(preferredLanguage);
    await this.assertPatientAccess(patientId, access);

    const sessions = await this.prisma.treatmentSession.findMany({
      where: {
        treatmentPlan: { patientId },
        status: TreatmentSessionStatus.PENDING,
      },
      select: patientTreatmentSessionListSelect(),
      orderBy: [{ treatmentPlanId: 'asc' }, { sessionOrder: 'asc' }],
    });

    return sessions.map(
      (session) =>
        new PatientTreatmentSessionResponseDto({
          ...this.mapSessionFields(
            session,
            language,
            null,
            session.treatmentPlan.sessions,
          ),
          treatmentPlanId: session.treatmentPlanId,
          planName: this.resolvePlanName(session.treatmentPlan, language),
        }),
    );
  }

  async listMedicalArchive(
    patientId: number,
    access: PatientTreatmentAccess,
    type?: PatientMedicalArchiveType,
    preferredLanguage?: string,
  ): Promise<PatientMedicalArchiveItemResponseDto[]> {
    const language = toUiLanguage(preferredLanguage);
    await this.assertPatientAccess(patientId, access);

    const attachments = await this.prisma.medicalAttachment.findMany({
      where: {
        type: type
          ? type
          : {
              in: [
                MedicalAttachmentType.XRAY,
                MedicalAttachmentType.REPORT,
              ],
            },
        encounter: {
          treatmentSession: { treatmentPlan: { patientId } },
        },
      },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
        mediaFile: { select: patientTreatmentMediaFileSelect() },
        encounter: {
          select: {
            treatmentSession: {
              select: {
                id: true,
                sessionOrder: true,
                titleAr: true,
                titleEn: true,
                treatmentPlan: {
                  select: {
                    id: true,
                    nameAr: true,
                    nameEn: true,
                    template: {
                      select: { nameAr: true, nameEn: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return attachments.map((attachment) => {
      const session = attachment.encounter.treatmentSession;
      const plan = session.treatmentPlan;

      return new PatientMedicalArchiveItemResponseDto({
        id: attachment.id,
        type: attachment.type,
        title: attachment.title,
        createdAt: attachment.createdAt,
        mediaFile: this.mapMediaFile(attachment.mediaFile),
        session: new PatientMedicalArchiveSessionResponseDto({
          id: session.id,
          sessionOrder: session.sessionOrder,
          title: pickLocalized(session.titleAr, session.titleEn, language),
          plan: new PatientMedicalArchivePlanResponseDto({
            id: plan.id,
            name: this.resolvePlanName(plan, language),
          }),
        }),
      });
    });
  }

  async listPlanSessionFiles(
    patientId: number,
    planId: number,
    access: PatientTreatmentAccess,
    type?: PatientSessionFileType,
    preferredLanguage?: string,
  ): Promise<PatientPlanSessionFilesResponseDto[]> {
    const language = toUiLanguage(preferredLanguage);
    await this.assertPatientAccess(patientId, access);

    const plan = await this.prisma.treatmentPlan.findFirstOrThrow({
      where: { id: planId, patientId },
      select: patientTreatmentPlanSessionFilesSelect(),
    });

    const items = plan.sessions.map((session) => {
      const prescription = session.encounter?.prescription ?? null;
      const attachments =
        session.encounter?.attachments.map((attachment) =>
          this.mapAttachment(attachment),
        ) ?? [];
      const title = pickLocalized(session.titleAr, session.titleEn, language);

      if (type === PatientSessionFileType.PRESCRIPTION) {
        if (!prescription) return null;
        return new PatientPlanSessionFilesResponseDto({
          id: session.id,
          sessionOrder: session.sessionOrder,
          title,
          prescription,
          attachments: [],
        });
      }

      if (
        type === PatientSessionFileType.XRAY ||
        type === PatientSessionFileType.REPORT ||
        type === PatientSessionFileType.PHOTO
      ) {
        const filtered = attachments.filter(
          (attachment) => attachment.type === type,
        );
        if (filtered.length === 0) return null;
        return new PatientPlanSessionFilesResponseDto({
          id: session.id,
          sessionOrder: session.sessionOrder,
          title,
          prescription: null,
          attachments: filtered,
        });
      }

      return new PatientPlanSessionFilesResponseDto({
        id: session.id,
        sessionOrder: session.sessionOrder,
        title,
        prescription,
        attachments,
      });
    });

    return items.filter(
      (item): item is PatientPlanSessionFilesResponseDto => item !== null,
    );
  }

  async getHome(
    patientId: number,
    accountId: number,
    preferredLanguage?: string,
  ) {
    await this.assertOwnedPatient(patientId, accountId);

    const pending =
      await this.treatmentSessionsService.findPendingRatingForPatient(
        patientId,
        preferredLanguage,
      );

    return new PatientHomeResponseDto({
      pendingRating: pending
        ? new PendingRatingWithSessionDto(pending)
        : null,
    });
  }

  async rateSession(
    patientId: number,
    sessionId: number,
    accountId: number,
    dto: RateTreatmentSessionDto,
    preferredLanguage?: string,
  ) {
    await this.assertOwnedPatient(patientId, accountId);

    return this.treatmentSessionsService.rateForPatient(
      patientId,
      sessionId,
      dto,
      preferredLanguage,
    );
  }

  private async assertOwnedPatient(patientId: number, accountId: number) {
    await this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId, accountId },
      select: { id: true },
    });
  }

  private async assertPatientAccess(
    patientId: number,
    access: PatientTreatmentAccess,
  ) {
    if (access.kind === 'patient') {
      await this.assertOwnedPatient(patientId, access.accountId);
      return;
    }

    await this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
      select: { id: true },
    });
  }

  private resolvePlanName(
    plan: {
      nameAr: string | null;
      nameEn: string | null;
      template: { nameAr: string; nameEn: string } | null;
    },
    language: UiLanguage,
  ): string {
    if (plan.template) {
      return pickLocalized(
        plan.template.nameAr,
        plan.template.nameEn,
        language,
      );
    }

    return pickLocalized(plan.nameAr ?? '', plan.nameEn ?? '', language);
  }

  private mapPlanSummary(
    plan: {
      id: number;
      patientId: number;
      status: PatientTreatmentPlanResponseDto['status'];
      estimatedCost: { toString(): string };
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      nameAr: string | null;
      nameEn: string | null;
      template: { nameAr: string; nameEn: string } | null;
      sessions: SessionProgressInput[];
    },
    language: UiLanguage,
  ): PatientTreatmentPlanResponseDto {
    const { sessionCount, progressPercent } = this.computeProgress(
      plan.sessions,
    );

    return new PatientTreatmentPlanResponseDto({
      id: plan.id,
      patientId: plan.patientId,
      status: plan.status,
      estimatedCost: plan.estimatedCost.toString(),
      isActive: plan.isActive,
      sessionCount,
      progressPercent,
      name: this.resolvePlanName(plan, language),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });
  }

  private computeProgress(sessions: SessionProgressInput[]): {
    sessionCount: number;
    progressPercent: number;
  } {
    const nonCancelled = sessions.filter(
      (s) => s.status !== TreatmentSessionStatus.CANCELLED,
    );
    const completed = nonCancelled.filter(
      (s) => s.status === TreatmentSessionStatus.COMPLETED,
    ).length;
    const sessionCount = nonCancelled.length;
    const progressPercent =
      sessionCount === 0
        ? 0
        : Math.round((completed / sessionCount) * 100);

    return { sessionCount, progressPercent };
  }

  private mapSessionFields(
    session: {
      id: number;
      sessionOrder: number;
      titleAr: string;
      titleEn: string;
      status: TreatmentSessionStatus;
      durationMinutes: number | null;
      estimatedCost: { toString(): string };
      availableForBookingAt: Date | null;
      completedAt: Date | null;
      rating: number | null;
      appointments?: SessionAppointment[];
      encounter: {
        id: number;
        prescription: string | null;
        attachments: PatientAttachment[];
        diagnosis: string | null;
        clinicalNotes: string | null;
      } | null;
    },
    language: UiLanguage,
    pendingRating: PatientSessionPendingRating = null,
    planSessions: SessionOrderStatus[] = [],
  ) {
    const appointments = session.appointments ?? [];
    const hasActiveAppointment = appointments.some((a) =>
      (ACTIVE_APPOINTMENT_STATUSES as readonly AppointmentStatus[]).includes(
        a.status,
      ),
    );
    const latestAppointment = appointments[0] ?? null;

    return {
      id: session.id,
      sessionOrder: session.sessionOrder,
      title: pickLocalized(session.titleAr, session.titleEn, language),
      status: session.status,
      canBook: computeCanBook(session, planSessions, hasActiveAppointment),
      canTreat: computeCanTreat(session, latestAppointment),
      durationMinutes: session.durationMinutes,
      estimatedCost: ESTIMATED_COST_VISIBLE_STATUSES.has(session.status)
        ? session.estimatedCost.toString()
        : null,
      availableForBookingAt: session.availableForBookingAt,
      completedAt: session.completedAt,
      rating: session.rating,
      pendingRating:
        pendingRating?.treatmentSessionId === session.id
          ? new PatientSessionPendingRatingResponseDto({
              enabled: true,
              canRateUntil: pendingRating.canRateUntil,
            })
          : null,
      encounter: session.encounter
        ? new PatientTreatmentEncounterResponseDto({
            id: session.encounter.id,
            prescription: session.encounter.prescription,
            diagnosis: session.encounter.diagnosis,
            clinicalNotes: session.encounter.clinicalNotes,
            attachments: session.encounter.attachments.map((attachment) =>
              this.mapAttachment(attachment),
            ),
          })
        : null,
    };
  }

  private mapAttachment(
    attachment: PatientAttachment,
  ): PatientMedicalAttachmentResponseDto {
    return new PatientMedicalAttachmentResponseDto({
      id: attachment.id,
      type: attachment.type,
      title: attachment.title,
      createdAt: attachment.createdAt,
      mediaFile: this.mapMediaFile(attachment.mediaFile),
    });
  }

  private mapMediaFile(
    mediaFile: PatientMediaFile,
  ): PatientTreatmentMediaFileResponseDto {
    return new PatientTreatmentMediaFileResponseDto({
      ...mediaFile,
      publicUrl: buildPublicMediaUrl(mediaFile.path),
    });
  }
}
