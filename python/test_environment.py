#!/usr/bin/env python3
"""
Простой скрипт для тестирования RL среды трейдинга
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from environment.trading_env import TradingEnvironment

def create_sample_data():
    """Создание тестовых данных"""
    print("Создаём тестовые данные...")
    
    # Создаём синтетические данные OHLCV
    dates = pd.date_range(start='2024-01-01', end='2024-01-31', freq='1H')
    n_days = len(dates)
    
    # Базовые параметры
    base_price = 50000  # BTC цена
    volatility = 0.02   # 2% волатильность
    
    # Генерируем цены
    np.random.seed(42)  # Для воспроизводимости
    
    returns = np.random.normal(0, volatility, n_days)
    prices = base_price * np.exp(np.cumsum(returns))
    
    # Создаём OHLCV
    data = []
    for i in range(len(dates)):
        date = dates[i]
        price = prices[i]
        # Добавляем случайность к OHLC
        high = price * (1 + abs(np.random.normal(0, 0.01)))
        low = price * (1 - abs(np.random.normal(0, 0.01)))
        open_price = price * (1 + np.random.normal(0, 0.005))
        close_price = price * (1 + np.random.normal(0, 0.005))
        
        # Объём
        volume = np.random.uniform(100, 1000)
        
        data.append({
            'timestamp': date,
            'open': open_price,
            'high': high,
            'low': low,
            'close': close_price,
            'volume': volume
        })
    
    df = pd.DataFrame(data)
    df = df.set_index('timestamp')
    
    print(f"Создано {len(df)} тестовых свечей")
    print(f"Диапазон цен: {df['close'].min():.2f} - {df['close'].max():.2f}")
    
    return df

def test_environment():
    """Тестирование торговой среды"""
    print("\n=== ТЕСТИРОВАНИЕ RL СРЕДЫ ===")
    
    # Создаём тестовые данные
    data = create_sample_data()
    
    # Создаём среду
    env = TradingEnvironment(
        data=data,
        window_size=24,  # 24 часа
        commission_rate=0.0004,
        slippage_rate=0.0001,
        initial_balance=10000.0,
        max_position_size=0.1
    )
    
    print(f"Размер наблюдения: {env.observation_space.shape}")
    print(f"Количество действий: {env.action_space.n}")
    print(f"Максимальное количество шагов: {env.max_steps}")
    
    # Тестируем несколько эпизодов
    n_episodes = 3
    
    for episode in range(n_episodes):
        print(f"\n--- Эпизод {episode + 1} ---")
        
        obs, info = env.reset()
        print(f"Начальное состояние: {obs.shape}")
        print(f"Начальный баланс: {info['balance']:.2f}")
        
        total_reward = 0
        step = 0
        
        while step < 100:  # Ограничиваем количество шагов для теста
            # Случайное действие
            action = env.action_space.sample()
            
            obs, reward, done, truncated, info = env.step(action)
            total_reward += reward
            step += 1
            
            if step % 20 == 0:
                print(f"Шаг {step}: Действие={action}, Награда={reward:.6f}, Баланс={info['balance']:.2f}")
            
            if done:
                break
        
        # Получаем статистику
        stats = env.get_statistics()
        print(f"Эпизод завершён за {step} шагов")
        print(f"Общая награда: {total_reward:.6f}")
        print(f"Финальный баланс: {info['balance']:.2f}")
        print(f"Количество сделок: {info['trades_count']}")
        
        if stats:
            print(f"Статистика: {stats}")
    
    print("\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===")

def test_simple_strategy():
    """Тестирование простой стратегии"""
    print("\n=== ТЕСТИРОВАНИЕ ПРОСТОЙ СТРАТЕГИИ ===")
    
    # Создаём тестовые данные
    data = create_sample_data()
    
    # Создаём среду
    env = TradingEnvironment(
        data=data,
        window_size=24,
        commission_rate=0.0004,
        slippage_rate=0.0001,
        initial_balance=10000.0,
        max_position_size=0.1
    )
    
    # Простая стратегия: покупаем при падении, продаём при росте
    obs, info = env.reset()
    step = 0
    
    while step < 200:  # 200 шагов
        # Получаем текущую цену
        current_price = env.data.iloc[env.current_step - 1]['close'] if env.current_step > 0 else env.data.iloc[0]['close']
        
        # Простая логика: если цена упала на 1%, покупаем
        if step > 0:
            prev_price = env.data.iloc[step - 1]['close']
            price_change = (current_price - prev_price) / prev_price
            
            if price_change < -0.01:  # Падение на 1%
                action = 1  # BUY
            elif price_change > 0.01:  # Рост на 1%
                action = 2  # SELL
            else:
                action = 0  # HOLD
        else:
            action = 0  # HOLD
        
        obs, reward, done, truncated, info = env.step(action)
        step += 1
        
        if step % 50 == 0:
            print(f"Шаг {step}: Цена={current_price:.2f}, Действие={action}, Баланс={info['balance']:.2f}")
        
        if done:
            break
    
    # Финальная статистика
    stats = env.get_statistics()
    print(f"\nФинальная статистика:")
    print(f"Баланс: {info['balance']:.2f}")
    print(f"Общий PnL: {info['total_pnl']:.2f}")
    print(f"Количество сделок: {info['trades_count']}")
    
    if stats:
        print(f"Доходность: {stats.get('total_return', 0):.4f}")
        print(f"Win Rate: {stats.get('win_rate', 0):.2f}")

if __name__ == "__main__":
    print("🤖 Тестирование ИИ-трейдинг среды")
    print("=" * 50)
    
    try:
        # Тестируем среду
        test_environment()
        
        # Тестируем простую стратегию
        test_simple_strategy()
        
        print("\n✅ Все тесты пройдены успешно!")
        
    except Exception as e:
        print(f"\n❌ Ошибка при тестировании: {str(e)}")
        import traceback
        traceback.print_exc()
