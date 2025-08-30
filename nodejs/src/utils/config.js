/**
 * Конфигурация ИИ-Трейдинг Бота
 */

const config = {
  // База данных
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'trading_bot',
    user: process.env.DB_USER || 'trading_user',
    password: process.env.DB_PASSWORD || 'trading_password',
    ssl: process.env.NODE_ENV === 'production'
  },

  // Binance API
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
    testnet: process.env.BINANCE_TESTNET === 'true',
    baseUrl: process.env.BINANCE_TESTNET === 'true'
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com'
  },

  // Конфигурация бота
  bot: {
    mode: process.env.BOT_MODE || 'paper_trading', // paper_trading, live_trading
    maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE) || 0.02, // 2%
    dailyStopLoss: parseFloat(process.env.DAILY_STOP_LOSS) || 0.05, // 5%
    tradingPairs: (process.env.TRADING_PAIRS || 'BTCUSDT,ETHUSDT').split(','),
    predictionInterval: parseInt(process.env.PREDICTION_INTERVAL) || 60000, // 1 минута
    maxPositions: parseInt(process.env.MAX_POSITIONS) || 3
  },

  // Модель ИИ
  model: {
    path: process.env.MODEL_PATH || '../python/models/trading_model_ppo_latest',
    inputSize: 64, // количество свечей для входа
    features: ['open', 'high', 'low', 'close', 'volume'],
    predictionThreshold: parseFloat(process.env.PREDICTION_THRESHOLD) || 0.6
  },

  // Сервер
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Логирование
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/trading_bot.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || 5
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },

  // Торговые параметры
  trading: {
    commission: parseFloat(process.env.COMMISSION_RATE) || 0.0004, // 0.04%
    slippage: parseFloat(process.env.SLIPPAGE_RATE) || 0.0001, // 0.01%
    minOrderSize: parseFloat(process.env.MIN_ORDER_SIZE) || 0.001, // BTC
    maxOrderSize: parseFloat(process.env.MAX_ORDER_SIZE) || 1.0, // BTC
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || 0.02, // 2%
    takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT) || 0.04 // 4%
  }
};

module.exports = config;




