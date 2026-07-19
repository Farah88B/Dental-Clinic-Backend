import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  APP_NAME: Joi.string().required(),

  PORT: Joi.number().default(3000),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  DATABASE_URL: Joi.string().required(),

JWT_SECRET:
  Joi.string()
    .min(32)
    .required(),

JWT_ACCESS_SECRET:
  Joi.string()
    .min(32)
    .required(),

JWT_REFRESH_SECRET:
  Joi.string()
    .min(32)
    .required(),
});

// this service will validate the environment variables using the above schema. If any of the required variables are missing or invalid, it will throw an error and prevent the application from starting.
/*
JWT_ACCESS_SECRET
        |
        +--> JwtModule
        +--> JwtStrategy
        +--> access token


JWT_REFRESH_SECRET
        |
        +--> refresh token
        +--> verifyRefreshToken

  */      