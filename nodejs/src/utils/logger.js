/**
 * Система логирования для ИИ-Трейдинг Бота
 */

const winston = require('winston');
const path = require('path');
const config = require('./config');

// Создаём форматтер для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Создаём консольный форматтер
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Создаём логгер
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'ai-trading-bot' },
  transports: [
    // Консольный вывод
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // Файловый вывод
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/trading_bot.log'),
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: logFormat
    }),
    
    // Отдельный файл для ошибок
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: logFormat
    })
  ]
});

// Если не в продакшене, добавляем детальное логирование
if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
}

// Создаём удобные методы для разных типов логов
const customLogger = {
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Специальные методы для торговли
  trade: (action, symbol, quantity, price, meta = {}) => {
    logger.info(`TRADE: ${action} ${quantity} ${symbol} @ ${price}`, {
      action,
      symbol,
      quantity,
      price,
      ...meta
    });
  },
  
  position: (action, symbol, side, quantity, meta = {}) => {
    logger.info(`POSITION: ${action} ${side} ${quantity} ${symbol}`, {
      action,
      symbol,
      side,
      quantity,
      ...meta
    });
  },
  
  prediction: (symbol, action, confidence, price, meta = {}) => {
    logger.info(`PREDICTION: ${symbol} -> ${action} (${confidence}%) @ ${price}`, {
      symbol,
      action,
      confidence,
      price,
      ...meta
    });
  },
  
  performance: (pnl, winRate, totalTrades, meta = {}) => {
    logger.info(`PERFORMANCE: PnL=${pnl}, Win Rate=${winRate}%, Trades=${totalTrades}`, {
      pnl,
      winRate,
      totalTrades,
      ...meta
    });
  }
};

module.exports = customLogger;




