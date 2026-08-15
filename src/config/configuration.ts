export default () => ({
  app: {
    name: process.env.APP_NAME,
    port: parseInt(process.env.PORT ?? '3000', 10),
    environment: process.env.NODE_ENV ?? 'development',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

   jwt: {
    secret: process.env.JWT_SECRET, 
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,

  accessExpiresIn: process.env.ACCESS_EXPIRES_IN ?? '1h',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? '7d',
},
  sms: {
    mode: process.env.SMS_MODE ?? 'stub',
    provider: process.env.SMS_PROVIDER ?? 'traccar',
    staticOtpCode: process.env.SMS_STATIC_OTP_CODE ?? '123456',
    apiUrl:
      process.env.SMS_API_URL ??
      (process.env.SMS_PROVIDER === 'smschef'
        ? 'https://www.cloud.smschef.com/api/send/sms'
        : 'https://www.traccar.org/sms/'),
    apiKey: process.env.SMS_API_KEY ?? '',
    deviceId: process.env.SMS_DEVICE_ID ?? '',
    sim: parseInt(process.env.SMS_SIM ?? '1', 10),
  },

  media: {
    uploadRoot: process.env.MEDIA_UPLOAD_ROOT ?? 'uploads',
    publicPath: process.env.MEDIA_PUBLIC_PATH ?? '/uploads',
  },

  clinic: {
    timezone: process.env.CLINIC_TIMEZONE ?? 'Asia/Damascus',
    checkInQrSecret:
      process.env.CLINIC_CHECKIN_QR_SECRET ??
      process.env.JWT_SECRET ??
      'dev-clinic-checkin-secret',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ?? '',
  },

});


// replace the process.env with the configService
//when calling : this.configService.get('jwt.secret');