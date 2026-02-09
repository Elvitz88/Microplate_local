import winston from 'winston';

const logLevel = process.env['LOG_LEVEL'] || 'info';
const logFormat = process.env['LOG_FORMAT'] || 'json';
const nodeEnv = process.env['NODE_ENV'] || 'development';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  logFormat === 'pretty'
    ? winston.format.colorize({ all: true })
    : winston.format.json(),
  winston.format.printf((info: winston.Logform.TransformableInfo) => {
    const { timestamp, level, message, ...meta } = info;
    if (logFormat === 'pretty') {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
      return `${timestamp} [${level}]: ${message}${metaStr}`;
    }
    return JSON.stringify({ timestamp, level, message, ...meta });
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: logLevel,
    format,
  }),
];

if (nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format,
  transports,
  exitOnError: false,
});

