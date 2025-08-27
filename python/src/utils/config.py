import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

class Config:
    """Конфигурация для Python части ИИ-трейдинг бота"""
    
    # База данных
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', 5432)
    DB_NAME = os.getenv('DB_NAME', 'trading_bot')
    DB_USER = os.getenv('DB_USER', 'trading_user')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'trading_password')
    
    # Binance API
    BINANCE_API_KEY = os.getenv('BINANCE_API_KEY')
    BINANCE_SECRET_KEY = os.getenv('BINANCE_SECRET_KEY')
    BINANCE_TESTNET = os.getenv('BINANCE_TESTNET', 'true').lower() == 'true'
    
    # Модель
    MODEL_PATH = os.getenv('MODEL_PATH', './models/trading_model.onnx')
    MODEL_SAVE_PATH = './models/'
    
    # Данные
    DATA_PATH = './data/'
    TRADING_PAIRS = os.getenv('TRADING_PAIRS', 'BTCUSDT,ETHUSDT').split(',')
    
    # RL параметры
    WINDOW_SIZE = 64  # количество свечей для входа
    FEATURES = ['open', 'high', 'low', 'close', 'volume']
    COMMISSION_RATE = 0.0004  # 0.04% комиссия Binance
    SLIPPAGE_RATE = 0.0001   # 0.01% проскальзывание
    
    # Обучение
    TRAIN_START_DATE = '2020-01-01'
    TRAIN_END_DATE = '2024-01-01'
    VALIDATION_SPLIT = 0.2
    BATCH_SIZE = 256
    LEARNING_RATE = 3e-4
    TOTAL_TIMESTEPS = 1000000
    
    # Логирование
    LOG_PATH = './logs/'
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
