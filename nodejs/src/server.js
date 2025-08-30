#!/usr/bin/env node
/**
 * 🤖 ИИ-Трейдинг Бот - Основной сервер
 * 
 * Интегрирует Python RL модель с Node.js торговым ботом
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const config = require('./utils/config');
const logger = require('./utils/logger');
const database = require('./utils/database');

// Инициализируем Express приложение
const app = express();
const PORT = config.server.port;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// API маршруты
app.use('/api/v1', require('./api/routes'));

// Основная страница
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🤖 ИИ-Трейдинг Бот</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; }
        .status { padding: 15px; margin: 20px 0; border-radius: 5px; }
        .status.running { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.stopped { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .endpoints { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .endpoint { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #007bff; }
        .method { font-weight: bold; color: #007bff; }
        .url { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 ИИ-Трейдинг Бот</h1>
        
        <div class="status running">
          ✅ Сервер работает на порту ${PORT}
        </div>
        
        <h2>📡 API Endpoints</h2>
        <div class="endpoints">
          <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/v1/status</span> - Статус бота
          </div>
          <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/v1/positions</span> - Открытые позиции
          </div>
          <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/v1/trades</span> - История сделок
          </div>
          <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/v1/performance</span> - Производительность
          </div>
          <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api/v1/control/start</span> - Запустить бота
          </div>
          <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api/v1/control/stop</span> - Остановить бота
          </div>
        </div>
        
        <h2>🔧 Технологии</h2>
        <ul>
          <li><strong>Python:</strong> Reinforcement Learning (PPO модель)</li>
          <li><strong>Node.js:</strong> Торговый бот и API</li>
          <li><strong>PostgreSQL:</strong> База данных</li>
          <li><strong>Binance:</strong> Криптобиржа</li>
        </ul>
        
        <p style="text-align: center; color: #6c757d; margin-top: 30px;">
          🚀 Самообучающийся ИИ-трейдинг бот на основе RL
        </p>
      </div>
    </body>
    </html>
  `);
});

// Обработка ошибок
app.use((err, req, res, next) => {
  logger.error('Ошибка сервера:', err);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Что-то пошло не так'
  });
});

// 404 для неизвестных маршрутов
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Запуск сервера
async function startServer() {
  try {
    // Подключаемся к базе данных
    await database.connect();
    logger.info('✅ Подключение к базе данных установлено');
    
    // Запускаем сервер
    app.listen(PORT, () => {
      logger.info(`🚀 ИИ-Трейдинг Бот запущен на порту ${PORT}`);
      logger.info(`🌐 Откройте http://localhost:${PORT} в браузере`);
    });
    
  } catch (error) {
    logger.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 Получен сигнал SIGTERM, завершаем работу...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 Получен сигнал SIGINT, завершаем работу...');
  await database.disconnect();
  process.exit(0);
});

// Запускаем сервер
startServer();




