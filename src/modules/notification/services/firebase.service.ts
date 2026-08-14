import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { FCM_PERMANENT_ERROR_CODES } from 'src/common/constants/notification.constants';

export type FcmSendResult = {
  token: string;
  success: boolean;
  permanent: boolean;
  errorCode?: string;
};

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: Messaging | null = null;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>('firebase.projectId')?.trim();
    const clientEmail = this.config.get<string>('firebase.clientEmail')?.trim();
    const privateKey = this.normalizePrivateKey(
      this.config.get<string>('firebase.privateKey'),
    );

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials missing — FCM disabled (notifications still persist)',
      );
      return;
    }

    try {
      const app =
        getApps().length > 0
          ? getApps()[0]
          : initializeApp({
              credential: cert({
                projectId,
                clientEmail,
                privateKey,
              }),
            });
      this.messaging = getMessaging(app);
      this.enabled = true;
      this.logger.log(`Firebase Admin initialized for project ${projectId}`);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to initialize Firebase Admin — FCM disabled',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendToTokens(input: {
    tokens: string[];
    title: string;
    body: string;
    data: Record<string, string>;
  }): Promise<FcmSendResult[]> {
    if (input.tokens.length === 0) {
      return [];
    }

    if (!this.enabled || !this.messaging) {
      this.logger.debug(
        `FCM stub: skip send to ${input.tokens.length} token(s) (${input.title})`,
      );
      return input.tokens.map((token) => ({
        token,
        success: true,
        permanent: false,
      }));
    }

    const results: FcmSendResult[] = [];
    const chunkSize = 500;

    for (let i = 0; i < input.tokens.length; i += chunkSize) {
      const chunk = input.tokens.slice(i, i + chunkSize);
      const response = await this.messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: input.data,
      });

      response.responses.forEach((item, index) => {
        const token = chunk[index];
        if (item.success) {
          results.push({ token, success: true, permanent: false });
          return;
        }

        const errorCode = item.error?.code;
        const permanent = Boolean(
          errorCode && FCM_PERMANENT_ERROR_CODES.has(errorCode),
        );
        results.push({
          token,
          success: false,
          permanent,
          errorCode,
        });
      });
    }

    return results;
  }

  private normalizePrivateKey(value: string | undefined): string {
    if (!value?.trim()) {
      return '';
    }
    return value.replace(/\\n/g, '\n').trim();
  }
}
