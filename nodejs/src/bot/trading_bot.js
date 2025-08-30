/**
 * 🤖 Основной торговый бот
 * 
 * Интегрирует ИИ модель с исполнением торговых решений
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const config = require('../utils/config');
const database = require('../utils/database');

class TradingBot extends EventEmitter {
  constructor() {
    super();
    
    this.isRunning = false;
    this.isTrading = false;
    this.currentPositions = new Map();
    this.tradingHistory = [];
    this.performanceMetrics = {
      totalPnL: 0,
      winRate: 0,
      totalTrades: 0,
      profitableTrades: 0,
      maxDrawdown: 0
    };
    
    // Таймеры
    this.predictionTimer = null;
    this.healthCheckTimer = null;
    
    // Состояние
    this.lastPrediction = null;
    this.lastTradeTime = null;
    this.dailyPnL = 0;
    this.sessionStartTime = null;
  }

  /**
   * Запуск бота
   */
  async start() {
    try {
      logger.info('🚀 Запуск торгового бота...');
      
      if (this.isRunning) {
        logger.warn('Бот уже запущен');
        return false;
      }

      // Инициализация
      await this.initialize();
      
      // Запуск основных циклов
      this.startPredictionCycle();
      this.startHealthCheck();
      
      this.isRunning = true;
      this.sessionStartTime = new Date();
      
      logger.info('✅ Торговый бот запущен');
      this.emit('botStarted');
      
      return true;
      
    } catch (error) {
      logger.error('❌ Ошибка запуска бота:', error);
      this.emit('botError', error);
      return false;
    }
  }

  /**
   * Остановка бота
   */
  async stop() {
    try {
      logger.info('🛑 Остановка торгового бота...');
      
      if (!this.isRunning) {
        logger.warn('Бот уже остановлен');
        return false;
      }

      // Остановка таймеров
      this.stopPredictionCycle();
      this.stopHealthCheck();
      
      // Закрытие всех позиций
      await this.closeAllPositions();
      
      // Сохранение финальных метрик
      await this.savePerformanceMetrics();
      
      this.isRunning = false;
      this.isTrading = false;
      
      logger.info('✅ Торговый бот остановлен');
      this.emit('botStopped');
      
      return true;
      
    } catch (error) {
      logger.error('❌ Ошибка остановки бота:', error);
      this.emit('botError', error);
      return false;
    }
  }

  /**
   * Экстренная остановка
   */
  async emergencyStop() {
    try {
      logger.warn('🚨 ЭКСТРЕННАЯ ОСТАНОВКА БОТА!');
      
      // Немедленная остановка
      this.isRunning = false;
      this.isTrading = false;
      
      // Остановка таймеров
      this.stopPredictionCycle();
      this.stopHealthCheck();
      
      // Принудительное закрытие позиций
      await this.forceCloseAllPositions();
      
      logger.warn('🚨 Экстренная остановка выполнена');
      this.emit('botEmergencyStopped');
      
    } catch (error) {
      logger.error('❌ Ошибка экстренной остановки:', error);
      this.emit('botError', error);
    }
  }

  /**
   * Инициализация бота
   */
  async initialize() {
    try {
      logger.info('🔧 Инициализация торгового бота...');
      
      // Загрузка конфигурации
      await this.loadConfiguration();
      
      // Загрузка существующих позиций
      await this.loadPositions();
      
      // Загрузка метрик производительности
      await this.loadPerformanceMetrics();
      
      // Проверка здоровья системы
      await this.healthCheck();
      
      logger.info('✅ Инициализация завершена');
      
    } catch (error) {
      logger.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  /**
   * Загрузка конфигурации
   */
  async loadConfiguration() {
    try {
      const result = await database.query(`
        SELECT key, value FROM bot_config
      `);
      
      this.config = {};
      result.rows.forEach(row => {
        this.config[row.key] = row.value;
      });
      
      logger.info('📋 Конфигурация загружена');
      
    } catch (error) {
      logger.error('❌ Ошибка загрузки конфигурации:', error);
      // Используем значения по умолчанию
      this.config = {
        max_risk_per_trade: '0.02',
        daily_stop_loss: '0.05',
        trading_pairs: 'BTCUSDT,ETHUSDT'
      };
    }
  }

  /**
   * Загрузка позиций
   */
  async loadPositions() {
    try {
      const result = await database.query(`
        SELECT * FROM positions WHERE status = 'OPEN'
      `);
      
      this.currentPositions.clear();
      result.rows.forEach(position => {
        this.currentPositions.set(position.symbol, position);
      });
      
      logger.info(`📊 Загружено ${this.currentPositions.size} открытых позиций`);
      
    } catch (error) {
      logger.error('❌ Ошибка загрузки позиций:', error);
    }
  }

  /**
   * Загрузка метрик производительности
   */
  async loadPerformanceMetrics() {
    try {
      const result = await database.query(`
        SELECT * FROM performance_metrics 
        ORDER BY timestamp DESC 
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        const metrics = result.rows[0];
        this.performanceMetrics = {
          totalPnL: parseFloat(metrics.total_pnl || 0),
          winRate: parseFloat(metrics.win_rate || 0),
          totalTrades: parseInt(metrics.total_trades || 0),
          profitableTrades: parseInt(metrics.profitable_trades || 0),
          maxDrawdown: parseFloat(metrics.max_drawdown || 0)
        };
      }
      
      logger.info('📈 Метрики производительности загружены');
      
    } catch (error) {
      logger.error('❌ Ошибка загрузки метрик:', error);
    }
  }

  /**
   * Запуск цикла предсказаний
   */
  startPredictionCycle() {
    if (this.predictionTimer) {
      clearInterval(this.predictionTimer);
    }
    
    const interval = parseInt(config.bot.predictionInterval);
    
    this.predictionTimer = setInterval(async () => {
      if (this.isRunning && this.isTrading) {
        await this.makePrediction();
      }
    }, interval);
    
    logger.info(`🔄 Цикл предсказаний запущен (${interval}ms)`);
  }

  /**
   * Остановка цикла предсказаний
   */
  stopPredictionCycle() {
    if (this.predictionTimer) {
      clearInterval(this.predictionTimer);
      this.predictionTimer = null;
      logger.info('🛑 Цикл предсказаний остановлен');
    }
  }

  /**
   * Запуск проверки здоровья
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      await this.healthCheck();
    }, 30000); // каждые 30 секунд
    
    logger.info('🏥 Проверка здоровья запущена');
  }

  /**
   * Остановка проверки здоровья
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info('🛑 Проверка здоровья остановлена');
    }
  }

  /**
   * Проверка здоровья системы
   */
  async healthCheck() {
    try {
      // Проверка базы данных
      const dbHealth = await database.healthCheck();
      
      // Проверка торговых параметров
      const tradingHealth = {
        positions: this.currentPositions.size,
        dailyPnL: this.dailyPnL,
        riskLevel: this.calculateRiskLevel()
      };
      
      const health = {
        timestamp: new Date().toISOString(),
        database: dbHealth,
        trading: tradingHealth,
        bot: {
          running: this.isRunning,
          trading: this.isTrading,
          uptime: this.sessionStartTime ? Date.now() - this.sessionStartTime.getTime() : 0
        }
      };
      
      // Логируем только при проблемах
      if (dbHealth.status !== 'healthy' && dbHealth.status !== 'mock') {
        logger.warn('⚠️ Проблемы с базой данных:', dbHealth);
      }
      
      this.emit('healthCheck', health);
      return health;
      
    } catch (error) {
      logger.error('❌ Ошибка проверки здоровья:', error);
      return { error: error.message };
    }
  }

  /**
   * Расчёт уровня риска
   */
  calculateRiskLevel() {
    // Проверяем что конфигурация загружена
    if (!this.config || !this.config.max_risk_per_trade) {
      return 'UNKNOWN';
    }
    
    const maxRisk = parseFloat(this.config.max_risk_per_trade || 0.02);
    const dailyLoss = parseFloat(this.config.daily_stop_loss || 0.05);
    
    const currentRisk = Math.abs(this.dailyPnL) / 10000; // относительно начального баланса
    
    if (currentRisk >= dailyLoss) {
      return 'CRITICAL';
    } else if (currentRisk >= dailyLoss * 0.8) {
      return 'HIGH';
    } else if (currentRisk >= dailyLoss * 0.5) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Получение статуса бота
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isTrading: this.isTrading,
      currentPositions: this.currentPositions.size,
      performance: this.performanceMetrics,
      dailyPnL: this.dailyPnL,
      riskLevel: this.calculateRiskLevel(),
      uptime: this.sessionStartTime ? Date.now() - this.sessionStartTime.getTime() : 0,
      lastPrediction: this.lastPrediction,
      lastTradeTime: this.lastTradeTime
    };
  }

  /**
   * Заглушка для предсказаний (будет заменена на реальную модель)
   */
  async makePrediction() {
    try {
      logger.debug('🧠 Получение предсказания от ИИ модели...');
      
      // TODO: Здесь будет интеграция с Python моделью
      const prediction = {
        symbol: 'BTCUSDT',
        action: 'HOLD',
        confidence: 0.5,
        price: 28000,
        timestamp: new Date().toISOString()
      };
      
      this.lastPrediction = prediction;
      logger.prediction(prediction.symbol, prediction.action, prediction.confidence * 100, prediction.price);
      
      // Эмулируем торговое решение
      await this.executeTradeDecision(prediction);
      
    } catch (error) {
      logger.error('❌ Ошибка получения предсказания:', error);
    }
  }

  /**
   * Исполнение торгового решения
   */
  async executeTradeDecision(prediction) {
    try {
      if (prediction.action === 'HOLD') {
        logger.debug('⏸️ Действие: HOLD - ничего не делаем');
        return;
      }
      
      // Проверяем риск
      if (!this.checkRiskLimits(prediction)) {
        logger.warn('⚠️ Торговля заблокирована: превышен лимит риска');
        return;
      }
      
      // TODO: Здесь будет реальное исполнение ордеров
      logger.info(`📊 Исполнение: ${prediction.action} ${prediction.symbol}`);
      
      // Эмулируем сделку
      await this.simulateTrade(prediction);
      
    } catch (error) {
      logger.error('❌ Ошибка исполнения торгового решения:', error);
    }
  }

  /**
   * Проверка лимитов риска
   */
  checkRiskLimits(prediction) {
    // Проверяем что конфигурация загружена
    if (!this.config || !this.config.max_risk_per_trade) {
      logger.warn('⚠️ Конфигурация не загружена, используем значения по умолчанию');
      this.config = {
        max_risk_per_trade: '0.02',
        daily_stop_loss: '0.05'
      };
    }
    
    const maxRisk = parseFloat(this.config.max_risk_per_trade || 0.02);
    const dailyLoss = parseFloat(this.config.daily_stop_loss || 0.05);
    
    // Проверяем дневной лимит убытков
    if (this.dailyPnL <= -dailyLoss * 10000) {
      logger.warn('🚨 Достигнут дневной лимит убытков');
      return false;
    }
    
    // Проверяем максимальный риск на сделку
    const currentRisk = Math.abs(this.dailyPnL) / 10000;
    if (currentRisk >= maxRisk) {
      logger.warn('🚨 Превышен максимальный риск на сделку');
      return false;
    }
    
    return true;
  }

  /**
   * Эмуляция сделки (для тестирования)
   */
  async simulateTrade(prediction) {
    try {
      const trade = {
        id: Date.now(),
        symbol: prediction.symbol,
        side: prediction.action,
        quantity: 0.001, // минимальный размер
        price: prediction.price,
        timestamp: new Date(),
        status: 'FILLED',
        pnl: 0,
        commission: prediction.price * 0.001 * 0.0004, // 0.04%
        model_prediction: prediction
      };
      
      // Обновляем метрики
      this.updatePerformanceMetrics(trade);
      
      // Сохраняем в базу
      await this.saveTrade(trade);
      
      logger.trade(trade.side, trade.symbol, trade.quantity, trade.price);
      
      this.lastTradeTime = new Date();
      this.emit('tradeExecuted', trade);
      
    } catch (error) {
      logger.error('❌ Ошибка эмуляции сделки:', error);
    }
  }

  /**
   * Обновление метрик производительности
   */
  updatePerformanceMetrics(trade) {
    this.performanceMetrics.totalTrades++;
    
    if (trade.pnl > 0) {
      this.performanceMetrics.profitableTrades++;
    }
    
    this.performanceMetrics.totalPnL += trade.pnl;
    this.dailyPnL += trade.pnl;
    
    // Обновляем win rate
    this.performanceMetrics.winRate = this.performanceMetrics.profitableTrades / this.performanceMetrics.totalTrades;
    
    // Обновляем максимальную просадку
    if (trade.pnl < 0) {
      this.performanceMetrics.maxDrawdown = Math.min(this.performanceMetrics.maxDrawdown, trade.pnl);
    }
  }

  /**
   * Сохранение сделки в базу
   */
  async saveTrade(trade) {
    try {
      await database.query(`
        INSERT INTO trades (symbol, side, quantity, price, timestamp, status, pnl, commission, model_prediction)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        trade.symbol,
        trade.side,
        trade.quantity,
        trade.price,
        trade.timestamp,
        trade.status,
        trade.pnl,
        trade.commission,
        JSON.stringify(trade.model_prediction)
      ]);
      
      logger.debug('💾 Сделка сохранена в базу данных');
      
    } catch (error) {
      logger.error('❌ Ошибка сохранения сделки:', error);
    }
  }

  /**
   * Сохранение метрик производительности
   */
  async savePerformanceMetrics() {
    try {
      await database.query(`
        INSERT INTO performance_metrics (total_pnl, win_rate, total_trades, profitable_trades, max_drawdown)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        this.performanceMetrics.totalPnL,
        this.performanceMetrics.winRate,
        this.performanceMetrics.totalTrades,
        this.performanceMetrics.profitableTrades,
        this.performanceMetrics.maxDrawdown
      ]);
      
      logger.info('💾 Метрики производительности сохранены');
      
    } catch (error) {
      logger.error('❌ Ошибка сохранения метрик:', error);
    }
  }

  /**
   * Закрытие всех позиций
   */
  async closeAllPositions() {
    try {
      logger.info('🔄 Закрытие всех позиций...');
      
      // TODO: Реальное закрытие позиций
      this.currentPositions.clear();
      
      logger.info('✅ Все позиции закрыты');
      
    } catch (error) {
      logger.error('❌ Ошибка закрытия позиций:', error);
    }
  }

  /**
   * Принудительное закрытие всех позиций
   */
  async forceCloseAllPositions() {
    try {
      logger.warn('🚨 Принудительное закрытие всех позиций...');
      
      // TODO: Принудительное закрытие через API биржи
      this.currentPositions.clear();
      
      logger.warn('🚨 Все позиции принудительно закрыты');
      
    } catch (error) {
      logger.error('❌ Ошибка принудительного закрытия позиций:', error);
    }
  }
}

module.exports = TradingBot;
