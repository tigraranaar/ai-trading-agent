/**
 * Подключение к PostgreSQL базе данных
 */

const { Pool } = require('pg');
const config = require('./config');
const logger = require('./logger');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.mockMode = process.env.MOCK_DATABASE === 'true' || !process.env.DB_HOST;
  }

  /**
   * Подключение к базе данных
   */
  async connect() {
    if (this.mockMode) {
      logger.warn('🔄 Режим заглушки: база данных не подключена');
      this.isConnected = true;
      return;
    }

    try {
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl,
        max: 20, // максимальное количество соединений
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Тестируем подключение
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('✅ Подключение к PostgreSQL установлено');
      
      // Инициализируем таблицы если их нет
      await this.initializeTables();
      
    } catch (error) {
      logger.error('❌ Ошибка подключения к базе данных:', error);
      throw error;
    }
  }

  /**
   * Отключение от базы данных
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('🛑 Отключение от PostgreSQL');
    }
  }

  /**
   * Инициализация таблиц
   */
  async initializeTables() {
    if (this.mockMode) return;

    try {
      const createTablesQuery = `
        -- Создание таблицы для сделок
        CREATE TABLE IF NOT EXISTS trades (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(20) NOT NULL,
          side VARCHAR(10) NOT NULL,
          quantity DECIMAL(20, 8) NOT NULL,
          price DECIMAL(20, 8) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          order_id VARCHAR(100),
          status VARCHAR(20) DEFAULT 'OPEN',
          pnl DECIMAL(20, 8) DEFAULT 0,
          commission DECIMAL(20, 8) DEFAULT 0,
          model_prediction JSONB,
          risk_metrics JSONB
        );

        -- Создание таблицы для позиций
        CREATE TABLE IF NOT EXISTS positions (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(20) NOT NULL,
          side VARCHAR(10) NOT NULL,
          quantity DECIMAL(20, 8) NOT NULL,
          entry_price DECIMAL(20, 8) NOT NULL,
          current_price DECIMAL(20, 8),
          pnl DECIMAL(20, 8) DEFAULT 0,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status VARCHAR(20) DEFAULT 'OPEN'
        );

        -- Создание таблицы для метрик производительности
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_pnl DECIMAL(20, 8) DEFAULT 0,
          win_rate DECIMAL(5, 4) DEFAULT 0,
          sharpe_ratio DECIMAL(10, 6) DEFAULT 0,
          max_drawdown DECIMAL(10, 6) DEFAULT 0,
          total_trades INTEGER DEFAULT 0,
          profitable_trades INTEGER DEFAULT 0
        );

        -- Создание таблицы для конфигурации бота
        CREATE TABLE IF NOT EXISTS bot_config (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Создание таблицы для логов
        CREATE TABLE IF NOT EXISTS bot_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          level VARCHAR(10) NOT NULL,
          message TEXT NOT NULL,
          context JSONB
        );
      `;

      await this.pool.query(createTablesQuery);
      logger.info('✅ Таблицы базы данных инициализированы');

      // Вставляем базовую конфигурацию
      await this.insertDefaultConfig();
      
    } catch (error) {
      logger.error('❌ Ошибка инициализации таблиц:', error);
      throw error;
    }
  }

  /**
   * Вставка базовой конфигурации
   */
  async insertDefaultConfig() {
    if (this.mockMode) return;

    try {
      const defaultConfig = [
        ['max_risk_per_trade', '0.02', 'Максимальный риск на сделку (2%)'],
        ['daily_stop_loss', '0.05', 'Дневной лимит убытков (5%)'],
        ['trading_pairs', 'BTCUSDT,ETHUSDT', 'Торговые пары'],
        ['model_path', '../python/models/trading_model_ppo_latest', 'Путь к модели'],
        ['prediction_interval', '60000', 'Интервал предсказаний в миллисекундах']
      ];

      for (const [key, value, description] of defaultConfig) {
        await this.pool.query(`
          INSERT INTO bot_config (key, value, description) 
          VALUES ($1, $2, $3) 
          ON CONFLICT (key) DO NOTHING
        `, [key, value, description]);
      }

      logger.info('✅ Базовая конфигурация вставлена');
      
    } catch (error) {
      logger.error('❌ Ошибка вставки конфигурации:', error);
    }
  }

  /**
   * Выполнение запроса
   */
  async query(text, params = []) {
    if (this.mockMode) {
      // Возвращаем заглушку для тестирования
      return this.mockQuery(text, params);
    }

    if (!this.isConnected) {
      throw new Error('База данных не подключена');
    }
    
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error('❌ Ошибка выполнения запроса:', error);
      throw error;
    }
  }

  /**
   * Заглушка для запросов в режиме тестирования
   */
  mockQuery(text, params) {
    logger.debug('🔄 Mock query:', text, params);
    
    // Имитируем задержку
    return new Promise(resolve => {
      setTimeout(() => {
        if (text.includes('performance_metrics')) {
          resolve({
            rows: [{
              total_pnl: 0.0,
              win_rate: 0.0,
              sharpe_ratio: 0.0,
              max_drawdown: 0.0,
              total_trades: 0,
              profitable_trades: 0
            }]
          });
        } else if (text.includes('positions')) {
          resolve({
            rows: [{ open_positions: 0 }]
          });
        } else if (text.includes('trades')) {
          resolve({
            rows: [{ today_trades: 0 }]
          });
        } else if (text.includes('bot_config')) {
          resolve({
            rows: [
              { key: 'model_path', value: '../python/models/trading_model_ppo_latest' },
              { key: 'trading_pairs', value: 'BTCUSDT,ETHUSDT' }
            ]
          });
        } else {
          resolve({ rows: [] });
        }
      }, 10);
    });
  }

  /**
   * Получение клиента для транзакций
   */
  async getClient() {
    if (this.mockMode) {
      throw new Error('Транзакции не поддерживаются в режиме заглушки');
    }

    if (!this.isConnected) {
      throw new Error('База данных не подключена');
    }
    
    return await this.pool.connect();
  }

  /**
   * Проверка здоровья базы данных
   */
  async healthCheck() {
    if (this.mockMode) {
      return {
        status: 'mock',
        timestamp: new Date().toISOString(),
        connection: true,
        message: 'Режим заглушки - реальная БД не подключена'
      };
    }

    try {
      const result = await this.query('SELECT NOW() as current_time');
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        connection: this.isConnected
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connection: this.isConnected
      };
    }
  }
}

// Экспортируем единственный экземпляр
module.exports = new Database();
