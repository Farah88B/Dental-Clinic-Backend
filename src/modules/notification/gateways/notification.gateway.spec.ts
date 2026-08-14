import { accountNotificationRoom } from 'src/common/constants/notification.constants';

describe('accountNotificationRoom', () => {
  it('joins the authenticated account room only', () => {
    expect(accountNotificationRoom(10)).toBe('account:10');
    expect(accountNotificationRoom(10)).not.toBe(accountNotificationRoom(11));
  });
});
