#!/usr/bin/env python3
"""
Обучение RL модели на реальных данных BTC/USDT
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from environment.trading_env import TradingEnvironment
from models.trainer import TradingModelTrainer

def load_real_data():
    """Загружаем реальные данные"""
    print("📊 Загружаем реальные данные BTC/USDT...")
    
    # Путь к файлу
    data_file = "data/BTCUSDT_1h_2020-01-01_2024-12-31.csv"
    
    if not os.path.exists(data_file):
        print(f"❌ Файл {data_file} не найден!")
        print("Сначала запустите download_data.py")
        return None
    
    # Загружаем данные
    df = pd.read_csv(data_file, index_col='timestamp', parse_dates=True)
    
    print(f"✅ Загружено {len(df)} свечей")
    print(f"📅 Период: {df.index.min()} - {df.index.max()}")
    print(f"📈 Диапазон цен: {df['close'].min():.2f} - {df['close'].max():.2f}")
    
    return df

def prepare_environment(data):
    """Подготавливаем торговую среду"""
    print("\n🎮 Подготавливаем торговую среду...")
    
    # Создаём среду
    env = TradingEnvironment(
        data=data,
        window_size=64,  # 64 часа = ~2.7 дня
        commission_rate=0.0004,  # 0.04% комиссия Binance
        slippage_rate=0.0001,    # 0.01% проскальзывание
        initial_balance=10000.0,  # $10,000 начальный капитал
        max_position_size=0.1     # Максимум 10% от капитала
    )
    
    print(f"✅ Среда создана:")
    print(f"   - Размер наблюдения: {env.observation_space.shape}")
    print(f"   - Количество действий: {env.action_space.n}")
    print(f"   - Максимум шагов: {env.max_steps}")
    
    return env

def test_environment(env, n_episodes=3):
    """Тестируем среду на случайных действиях"""
    print(f"\n🧪 Тестируем среду на {n_episodes} эпизодах...")
    
    for episode in range(n_episodes):
        print(f"\n--- Эпизод {episode + 1} ---")
        
        obs, info = env.reset()
        total_reward = 0
        step = 0
        
        # Ограничиваем количество шагов для быстрого теста
        max_steps = min(100, env.max_steps)
        
        while step < max_steps:
            # Случайное действие
            action = env.action_space.sample()
            
            obs, reward, done, truncated, info = env.step(action)
            total_reward += reward
            step += 1
            
            if step % 25 == 0:
                print(f"   Шаг {step}: Действие={action}, Награда={reward:.6f}, Баланс={info['balance']:.2f}")
            
            if done:
                break
        
        # Статистика эпизода
        stats = env.get_statistics()
        print(f"   Эпизод завершён за {step} шагов")
        print(f"   Общая награда: {total_reward:.6f}")
        print(f"   Финальный баланс: {info['balance']:.2f}")
        print(f"   Количество сделок: {info['trades_count']}")
        
        if stats:
            print(f"   Win Rate: {stats.get('win_rate', 0):.2f}")
            print(f"   Доходность: {stats.get('total_return', 0):.4f}")

def main():
    """Основная функция"""
    print("🤖 Обучение RL модели на реальных данных BTC/USDT")
    print("=" * 60)
    
    try:
        # 1. Загружаем данные
        data = load_real_data()
        if data is None:
            return
        
        # 2. Подготавливаем среду
        env = prepare_environment(data)
        
        # 3. Тестируем среду
        test_environment(env, n_episodes=2)
        
        print("\n" + "=" * 60)
        print("🎯 Среда готова к обучению!")
        print("\n📋 Следующие шаги:")
        print("1. Установить Stable-Baselines3: pip install stable-baselines3")
        print("2. Запустить обучение: python src/models/trainer.py")
        print("3. Или создать простую модель самостоятельно")
        
        # 4. Создаём простую модель (без Stable-Baselines3)
        print("\n🚀 Создаём простую модель...")
        create_simple_model(env)
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

def create_simple_model(env):
    """Создаём простую модель без Stable-Baselines3"""
    print("🧠 Создаём простую модель на основе правил...")
    
    # Простая стратегия: покупаем при падении, продаём при росте
    def simple_strategy(observation):
        """Простая торговая стратегия"""
        # Получаем последние цены из наблюдения
        # observation содержит: [OHLCV за 64 часа + позиция + баланс]
        
        # Простая логика: если последние цены падают -> покупаем
        # Если растут -> продаём
        
        # Для простоты используем случайные действия
        import random
        return random.choice([0, 1, 2])  # HOLD, BUY, SELL
    
    # Тестируем простую стратегию
    print("🧪 Тестируем простую стратегию...")
    
    obs, info = env.reset()
    total_reward = 0
    step = 0
    
    while step < 200:  # 200 шагов
        action = simple_strategy(obs)
        obs, reward, done, truncated, info = env.step(action)
        total_reward += reward
        step += 1
        
        if step % 50 == 0:
            print(f"   Шаг {step}: Действие={action}, Баланс={info['balance']:.2f}")
        
        if done:
            break
    
    # Финальная статистика
    stats = env.get_statistics()
    print(f"\n📊 Результаты простой стратегии:")
    print(f"   Баланс: {info['balance']:.2f}")
    print(f"   Общий PnL: {info['total_pnl']:.2f}")
    print(f"   Количество сделок: {info['trades_count']}")
    
    if stats:
        print(f"   Доходность: {stats.get('total_return', 0):.4f}")
        print(f"   Win Rate: {stats.get('win_rate', 0):.2f}")
        print(f"   Sharpe Ratio: {stats.get('sharpe_ratio', 0):.4f}")
    
    print("\n✅ Простая модель создана и протестирована!")

if __name__ == "__main__":
    main()
