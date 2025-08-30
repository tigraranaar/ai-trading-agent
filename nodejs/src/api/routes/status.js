/**
 * API маршруты для статуса бота
 */

const express = require('express');
const router = express.Router();
const database = require('../../utils/database');
const logger = require('../../utils/logger');

// Получение общего статуса системы
router.get('/', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    
    const status = {
      bot: {
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      database: dbHealth,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    res.json(status);
    
  } catch (error) {
    logger.error('Ошибка получения статуса:', error);
    res.status(500).json({ 
      error: 'Ошибка получения статуса',
      message: error.message 
    });
  }
});

// Статус базы данных
router.get('/database', async (req, res) => {
  try {
    const health = await database.healthCheck();
    res.json(health);
    
  } catch (error) {
    logger.error('Ошибка проверки БД:', error);
    res.status(500).json({ 
      error: 'Ошибка проверки базы данных',
      message: error.message 
    });
  }
});

// Статус торговли
router.get('/trading', async (req, res) => {
  try {
    // Получаем последние метрики производительности
    const result = await database.query(`
      SELECT * FROM performance_metrics 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    
    // Получаем количество открытых позиций
    const positionsResult = await database.query(`
      SELECT COUNT(*) as open_positions 
      FROM positions 
      WHERE status = 'OPEN'
    `);
    
    // Получаем количество сделок за сегодня
    const todayTradesResult = await database.query(`
      SELECT COUNT(*) as today_trades 
      FROM trades 
      WHERE DATE(timestamp) = CURRENT_DATE
    `);
    
    const tradingStatus = {
      lastPerformance: result.rows[0] || null,
      openPositions: parseInt(positionsResult.rows[0]?.open_positions || 0),
      todayTrades: parseInt(todayTradesResult.rows[0]?.today_trades || 0),
      timestamp: new Date().toISOString()
    };
    
    res.json(tradingStatus);
    
  } catch (error) {
    logger.error('Ошибка получения статуса торговли:', error);
    res.status(500).json({ 
      error: 'Ошибка получения статуса торговли',
      message: error.message 
    });
  }
});

// Статус модели ИИ
router.get('/model', async (req, res) => {
  try {
    // Получаем конфигурацию модели
    const result = await database.query(`
      SELECT * FROM bot_config 
      WHERE key LIKE 'model_%'
    `);
    
    const modelConfig = {};
    result.rows.forEach(row => {
      const key = row.key.replace('model_', '');
      modelConfig[key] = row.value;
    });
    
    const modelStatus = {
      config: modelConfig,
      status: 'loaded', // TODO: проверить реальный статус загрузки
      lastUpdate: new Date().toISOString(),
      features: ['open', 'high', 'low', 'close', 'volume'],
      inputSize: 64
    };
    
    res.json(modelStatus);
    
  } catch (error) {
    logger.error('Ошибка получения статуса модели:', error);
    res.status(500).json({ 
      error: 'Ошибка получения статуса модели',
      message: error.message 
    });
  }
});

module.exports = router;




