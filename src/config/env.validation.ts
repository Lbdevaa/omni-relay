import Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().min(32).required(),
  DATABASE_URL: Joi.string().uri().required(),
  RABBITMQ_URL: Joi.string().uri().required(),
  RABBITMQ_EXCHANGE: Joi.string().default('messages'),
  RABBITMQ_PREFETCH: Joi.number().integer().min(1).default(10),
  RABBITMQ_MAX_RETRIES: Joi.number().integer().min(0).default(5),
});
