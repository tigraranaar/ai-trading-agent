/**
 * API маршруты для ИИ-Трейдинг Бота
 */

const express = require('express');
const router = express.Router();

// Импортируем отдельные маршруты
const statusRoutes = require('./status');
const tradingRoutes = require('./trading');
const controlRoutes = require('./control');

// Основные маршруты
router.use('/status', statusRoutes);
router.use('/trading', tradingRoutes);
router.use('/control', controlRoutes);

// Корневой маршрут API
router.get('/', (req, res) => {
  res.json({
    message: '🤖 ИИ-Трейдинг Бот API v1.0',
    endpoints: {
      status: '/api/v1/status',
      trading: '/api/v1/trading',
      control: '/api/v1/control'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;




