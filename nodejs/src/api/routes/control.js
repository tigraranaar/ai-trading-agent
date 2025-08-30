/**
 * API маршруты для управления ботом
 */

const express = require('express');
const router = express.Router();
const TradingBot = require('../../bot/trading_bot');

// Создаём экземпляр торгового бота
const tradingBot = new TradingBot();

// Обработчики событий бота
tradingBot.on('botStarted', () => {
  console.log('🎉 Бот запущен через API');
});

tradingBot.on('botStopped', () => {
  console.log('🛑 Бот остановлен через API');
});

tradingBot.on('botEmergencyStopped', () => {
  console.log('🚨 Бот экстренно остановлен через API');
});

tradingBot.on('tradeExecuted', (trade) => {
  console.log('📊 Сделка выполнена:', trade.symbol, trade.side);
});

// Запуск бота
router.post('/start', async (req, res) => {
  try {
    const success = await tradingBot.start();
    
    if (success) {
      // Включаем торговлю
      tradingBot.isTrading = true;
      
      res.json({
        message: 'Бот успешно запущен',
        status: 'running',
        timestamp: new Date().toISOString(),
        botStatus: tradingBot.getStatus()
      });
    } else {
      res.status(400).json({
        error: 'Не удалось запустить бота',
        message: 'Бот уже запущен или произошла ошибка'
      });
    }
    
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка запуска бота',
      message: error.message
    });
  }
});

// Остановка бота
router.post('/stop', async (req, res) => {
  try {
    const success = await tradingBot.stop();
    
    if (success) {
      res.json({
        message: 'Бот успешно остановлен',
        status: 'stopped',
        timestamp: new Date().toISOString(),
        botStatus: tradingBot.getStatus()
      });
    } else {
      res.status(400).json({
        error: 'Не удалось остановить бота',
        message: 'Бот уже остановлен или произошла ошибка'
      });
    }
    
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка остановки бота',
      message: error.message
    });
  }
});

// Экстренная остановка
router.post('/emergency-stop', async (req, res) => {
  try {
    await tradingBot.emergencyStop();
    
    res.json({
      message: 'Экстренная остановка выполнена',
      status: 'emergency_stopped',
      timestamp: new Date().toISOString(),
      botStatus: tradingBot.getStatus()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка экстренной остановки',
      message: error.message
    });
  }
});

// Получение статуса бота
router.get('/status', (req, res) => {
  try {
    const status = tradingBot.getStatus();
    
    res.json({
      status: 'success',
      botStatus: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка получения статуса',
      message: error.message
    });
  }
});

// Включение/выключение торговли
router.post('/trading', (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Неверный параметр',
        message: 'Параметр "enabled" должен быть boolean'
      });
    }
    
    tradingBot.isTrading = enabled;
    
    res.json({
      message: `Торговля ${enabled ? 'включена' : 'выключена'}`,
      trading: enabled,
      timestamp: new Date().toISOString(),
      botStatus: tradingBot.getStatus()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка изменения режима торговли',
      message: error.message
    });
  }
});

module.exports = router;
