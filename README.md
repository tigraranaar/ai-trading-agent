# 🤖 ИИ-Трейдинг Бот

Самообучающийся трейдинг-бот на основе Reinforcement Learning для торговли криптовалютой на Binance Futures.

## 🚀 Быстрый старт

### Требования
- Python 3.8+
- Node.js 16+
- Docker & Docker Compose
- PostgreSQL

### Запуск
```bash
# 1. Клонировать проект
git clone <repository-url>
cd trading-agent

# 2. Запустить PostgreSQL
docker-compose up -d postgres

# 3. Обучить модель (Python)
cd python
pip install -r requirements.txt
python src/trainer.py

# 4. Запустить бота (Node.js)
cd ../nodejs
npm install
npm run dev
```

## 📁 Структура проекта
- `python/` - обучение RL модели
- `nodejs/` - боевой бот и UI
- `shared/` - общие конфигурации
- `docs/` - документация

## 🎯 MVP функции
- ✅ RL модель (SAC) для принятия решений
- ✅ Подключение к Binance Futures
- ✅ Простой веб-интерфейс
- ✅ Хранение сделок в PostgreSQL
- ✅ Paper trading режим

## 📊 Мониторинг
- Веб-интерфейс: http://localhost:3000
- API: http://localhost:3000/api
- База данных: localhost:5432

## 🔧 Конфигурация
Скопируйте `.env.example` в `.env` и настройте параметры.
