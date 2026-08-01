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
    staticOtpCode: process.env.SMS_STATIC_OTP_CODE ?? '123456',
  },

  media: {
    uploadRoot: process.env.MEDIA_UPLOAD_ROOT ?? 'uploads',
    publicPath: process.env.MEDIA_PUBLIC_PATH ?? '/uploads',
  },

});


// replace the process.env with the configService
//when calling : this.configService.get('jwt.secret');