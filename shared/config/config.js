// Общая конфигурация для ИИ-трейдинг бота

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
    mode: process.env.BOT_MODE || 'paper_trading',
    maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE) || 0.02,
    dailyStopLoss: parseFloat(process.env.DAILY_STOP_LOSS) || 0.05,
    tradingPairs: (process.env.TRADING_PAIRS || 'BTCUSDT,ETHUSDT').split(','),
    predictionInterval: parseInt(process.env.PREDICTION_INTERVAL) || 60000
  },

  // Модель ИИ
  model: {
    path: process.env.MODEL_PATH || './models/trading_model.onnx',
    inputSize: 64, // количество свечей для входа
    features: ['open', 'high', 'low', 'close', 'volume']
  },

  // Сервер
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Логирование
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/trading_bot.log'
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
};

module.exports = config;
