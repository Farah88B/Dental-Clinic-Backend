import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { AccountStatus } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import {
  accountNotificationRoom,
  NOTIFICATION_SOCKET_EVENT,
  NOTIFICATION_SOCKET_NAMESPACE,
} from 'src/common/constants/notification.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotificationResponseDto } from '../dto/notification-response.dto';

@WebSocketGateway({
  namespace: NOTIFICATION_SOCKET_NAMESPACE,
  cors: { origin: true, credentials: true },
})
export class NotificationGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const accountId = await this.authenticate(client);
      if (accountId == null) {
        client.disconnect(true);
        return;
      }
      await client.join(accountNotificationRoom(accountId));
      client.data.accountId = accountId;
    } catch (error) {
      this.logger.warn({
        error: error instanceof Error ? error.message : String(error),
        msg: 'Socket connection rejected',
      });
      client.disconnect(true);
    }
  }

  emitCreated(accountId: number, payload: NotificationResponseDto): void {
    this.server
      ?.to(accountNotificationRoom(accountId))
      .emit(NOTIFICATION_SOCKET_EVENT, payload);
  }

  private async authenticate(client: Socket): Promise<number | null> {
    const token = this.extractToken(client);
    if (!token) {
      return null;
    }

    const payload = this.jwt.verify<{ sub: number }>(token, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
    });

    if (!payload?.sub) {
      return null;
    }

    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });

    if (!account || account.status !== AccountStatus.ACTIVE) {
      return null;
    }

    return account.id;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7).trim();
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim();
    }

    return null;
  }
}
