// modules/auth/adapter/sms-gateway.interface.ts
export interface SmsGateway {
  send(phone: string, message: string): Promise<void>;
}