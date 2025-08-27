-- Инициализация базы данных для ИИ-трейдинг бота

-- Создание таблицы для сделок
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'BUY' или 'SELL'
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'FILLED', 'CANCELLED'
    pnl DECIMAL(20, 8) DEFAULT 0,
    commission DECIMAL(20, 8) DEFAULT 0,
    model_prediction JSONB, -- предсказание модели
    risk_metrics JSONB -- метрики риска
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
    level VARCHAR(10) NOT NULL, -- 'INFO', 'WARN', 'ERROR'
    message TEXT NOT NULL,
    context JSONB
);

-- Вставка базовой конфигурации
INSERT INTO bot_config (key, value, description) VALUES
('max_risk_per_trade', '0.02', 'Максимальный риск на сделку (2%)'),
('daily_stop_loss', '0.05', 'Дневной лимит убытков (5%)'),
('trading_pairs', 'BTCUSDT,ETHUSDT', 'Торговые пары'),
('model_path', './models/trading_model.onnx', 'Путь к модели'),
('prediction_interval', '60000', 'Интервал предсказаний в миллисекундах')
ON CONFLICT (key) DO NOTHING;

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON bot_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON bot_logs(level);
