# 📁 Структура проекта ИИ-Трейдинг Бота

## 🗂️ Корневая структура
```
trading-agent/
├── README.md
├── TODO.md
├── PROJECT_STRUCTURE.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── python/                    # 🐍 Python часть (обучение модели)
│   ├── requirements.txt
│   ├── src/
│   │   ├── data/
│   │   │   ├── collector.py      # Сбор данных с Binance
│   │   │   ├── preprocessor.py   # Подготовка данных
│   │   │   └── storage.py        # Хранение данных
│   │   ├── environment/
│   │   │   ├── trading_env.py    # RL среда для трейдинга
│   │   │   └── gym_wrapper.py    # Обёртка для Gym
│   │   ├── models/
│   │   │   ├── sac_model.py      # SAC модель
│   │   │   └── trainer.py        # Обучение модели
│   │   └── utils/
│   │       ├── config.py         # Конфигурация
│   │       └── metrics.py        # Метрики обучения
│   ├── notebooks/                # Jupyter notebooks для экспериментов
│   ├── data/                     # Исторические данные
│   ├── models/                   # Обученные модели
│   └── logs/                     # Логи обучения
│
├── nodejs/                      # 🟢 Node.js часть (боевой бот)
│   ├── package.json
│   ├── src/
│   │   ├── bot/
│   │   │   ├── trading_bot.js   # Основной бот
│   │   │   ├── risk_manager.js  # Управление рисками
│   │   │   └── order_manager.js # Управление ордерами
│   │   ├── ai/
│   │   │   ├── model_loader.js  # Загрузка ONNX модели
│   │   │   └── predictor.js     # Предсказания
│   │   ├── exchange/
│   │   │   ├── binance_client.js # API Binance
│   │   │   └── ccxt_wrapper.js   # Обёртка CCXT
│   │   ├── api/
│   │   │   ├── server.js        # Express сервер
│   │   │   └── routes/          # API маршруты
│   │   ├── ui/                  # Веб-интерфейс
│   │   │   ├── components/      # React компоненты
│   │   │   └── pages/           # Страницы
│   │   └── utils/
│   │       ├── config.js        # Конфигурация
│   │       ├── logger.js        # Логирование
│   │       └── database.js      # База данных
│   ├── public/                  # Статические файлы
│   └── logs/                    # Логи бота
│
├── shared/                      # 🔄 Общие файлы
│   ├── config/                  # Общие конфигурации
│   ├── types/                   # TypeScript типы
│   └── utils/                   # Общие утилиты
│
└── docs/                        # 📚 Документация
    ├── api.md                   # API документация
    ├── deployment.md            # Инструкции по развёртыванию
    └── troubleshooting.md       # Решение проблем
```

## 🔄 Взаимодействие компонентов

### Python → Node.js
1. **Обучение**: Python обучает SAC модель
2. **Экспорт**: Модель сохраняется в ONNX формат
3. **Передача**: ONNX файл копируется в Node.js папку

### Node.js (боевой бот)
1. **Загрузка**: Загружает ONNX модель через onnxruntime
2. **Данные**: Получает свежие данные с Binance
3. **Предсказание**: Кормит данные в модель
4. **Действие**: Исполняет торговые решения

## 🚀 Запуск проекта

### Python (обучение)
```bash
cd python
pip install -r requirements.txt
python src/trainer.py
```

### Node.js (бот)
```bash
cd nodejs
npm install
npm run dev
```

## 📊 Поток данных
```
Binance API → Python (обучение) → ONNX модель → Node.js (бот) → Binance API
     ↑                                                              ↓
     └─────────────── UI (мониторинг) ←───────────────┘
```

## 🔧 Конфигурация
- **Python**: `.env` файл с API ключами и параметрами
- **Node.js**: `config.js` с настройками бота
- **Общие**: `shared/config/` для общих параметров
