import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || 'logs';

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${stack || ''} ${metaString}`;
  })
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    level: logLevel
  })
];

// Add file transports only in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxFiles: '14d',
      maxSize: '20m'
    }),
    new DailyRotateFile({
      filename: `${logDir}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxFiles: '14d',
      maxSize: '20m'
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false
});

// Request logging helper
export const logRequest = (req, res, responseTime, error = null) => {
  const logData = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    responseTime: `${responseTime}ms`,
    statusCode: res.statusCode,
    userId: req.user?.id || null
  };

  if (error) {
    logger.error('Request failed', { ...logData, error: error.message, stack: error.stack });
  } else if (res.statusCode >= 400) {
    logger.warn('Request completed with error', logData);
  } else {
    logger.info('Request completed', logData);
  }
};

// GraphQL operation logging
export const logGraphQLOperation = (operationName, query, variables, user, responseTime, error = null) => {
  const logData = {
    operationName,
    query: query?.replace(/\s+/g, ' ').trim(),
    variables,
    userId: user?.id || null,
    responseTime: `${responseTime}ms`
  };

  if (error) {
    logger.error('GraphQL operation failed', { ...logData, error: error.message, stack: error.stack });
  } else {
    logger.info('GraphQL operation completed', logData);
  }
};

export default logger;