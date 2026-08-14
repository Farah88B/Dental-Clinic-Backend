import { plainToInstance } from 'class-transformer';
import { NotificationListQueryDto } from './notification-list-query.dto';

function parse(query: Record<string, unknown>): NotificationListQueryDto {
  return plainToInstance(NotificationListQueryDto, query, {
    enableImplicitConversion: true,
  });
}

describe('NotificationListQueryDto', () => {
  it('keeps isRead=false as false (query string)', () => {
    expect(parse({ isRead: 'false' }).isRead).toBe(false);
  });

  it('keeps isRead=true as true (query string)', () => {
    expect(parse({ isRead: 'true' }).isRead).toBe(true);
  });

  it('leaves isRead undefined when omitted', () => {
    expect(parse({}).isRead).toBeUndefined();
  });
});
