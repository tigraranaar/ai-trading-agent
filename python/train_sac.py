#!/usr/bin/env python3
"""
Обучение SAC модели на реальных данных BTC/USDT
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
import time

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from environment.trading_env import TradingEnvironment
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.monitor import Monitor

def load_real_data():
    """Загружаем реальные данные"""
    print("📊 Загружаем реальные данные BTC/USDT...")
    
    data_file = "data/BTCUSDT_1h_2020-01-01_2024-12-31.csv"
    
    if not os.path.exists(data_file):
        print(f"❌ Файл {data_file} не найден!")
        print("Сначала запустите download_data.py")
        return None
    
    df = pd.read_csv(data_file, index_col='timestamp', parse_dates=True)
    print(f"✅ Загружено {len(df)} свечей")
    
    return df

def create_vec_env(env):
    """Создаём векторную среду для Stable-Baselines3"""
    def make_env():
        return Monitor(env)
    
    return DummyVecEnv([make_env])

def setup_callbacks(eval_env):
    """Настраиваем колбэки для обучения"""
    callbacks = []
    
    # Колбэк для оценки
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path="./models/best_model/",
        log_path="./logs/eval/",
        eval_freq=5000,  # Оцениваем каждые 5000 шагов
        deterministic=True,
        render=False
    )
    callbacks.append(eval_callback)
    
    # Колбэк для сохранения чекпоинтов
    checkpoint_callback = CheckpointCallback(
        save_freq=10000,  # Сохраняем каждые 10000 шагов
        save_path="./models/checkpoints/",
        name_prefix="trading_model"
    )
    callbacks.append(checkpoint_callback)
    
    return callbacks

def train_ppo_model(env, total_timesteps=100000):
    """Обучаем PPO модель"""
    print(f"\n🧠 Начинаем обучение PPO модели на {total_timesteps} шагах...")
    
    # Создаём векторную среду
    vec_env = create_vec_env(env)
    
    # Создаём модель
    model = PPO(
        "MlpPolicy",
        vec_env,
        verbose=1,
        learning_rate=3e-4,
        batch_size=256,
        n_steps=2048,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01
    )
    
    # Настраиваем колбэки
    callbacks = setup_callbacks(vec_env)
    
    # Создаём папки для сохранения
    os.makedirs("./models/best_model/", exist_ok=True)
    os.makedirs("./models/checkpoints/", exist_ok=True)
    os.makedirs("./logs/eval/", exist_ok=True)

    
    # Обучаем модель
    print("🚀 Начинаем обучение...")
    start_time = time.time()
    
    model.learn(
        total_timesteps=total_timesteps,
        callback=callbacks
    )
    
    training_time = time.time() - start_time
    print(f"✅ Обучение завершено за {training_time:.2f} секунд!")
    
    return model

def evaluate_model(model, env, n_episodes=5):
    """Оцениваем обученную модель"""
    print(f"\n🧪 Оцениваем модель на {n_episodes} эпизодах...")
    
    total_rewards = []
    total_pnls = []
    win_rates = []
    
    for episode in range(n_episodes):
        print(f"\n--- Эпизод {episode + 1} ---")
        
        obs, info = env.reset()
        episode_reward = 0
        done = False
        step = 0
        
        while not done and step < 500:  # Ограничиваем количество шагов
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, done, truncated, info = env.step(action)
            episode_reward += reward
            step += 1
            
            if step % 100 == 0:
                print(f"   Шаг {step}: Действие={action}, Баланс={info['balance']:.2f}")
        
        # Получаем статистику эпизода
        stats = env.get_statistics()
        total_rewards.append(episode_reward)
        total_pnls.append(stats.get('total_return', 0))
        win_rates.append(stats.get('win_rate', 0))
        
        print(f"   Эпизод завершён за {step} шагов")
        print(f"   Общая награда: {episode_reward:.6f}")
        print(f"   Финальный баланс: {info['balance']:.2f}")
        print(f"   Количество сделок: {info['trades_count']}")
        print(f"   Win Rate: {stats.get('win_rate', 0):.2f}")
        print(f"   Доходность: {stats.get('total_return', 0):.4f}")
    
    # Агрегируем результаты
    results = {
        'mean_reward': np.mean(total_rewards),
        'std_reward': np.std(total_rewards),
        'mean_return': np.mean(total_pnls),
        'std_return': np.std(total_pnls),
        'mean_win_rate': np.mean(win_rates),
        'std_win_rate': np.std(win_rates)
    }
    
    print(f"\n📊 Результаты оценки:")
    print(f"   Средняя награда: {results['mean_reward']:.6f} ± {results['std_reward']:.6f}")
    print(f"   Средняя доходность: {results['mean_return']:.6f} ± {results['std_return']:.6f}")
    print(f"   Средний Win Rate: {results['mean_win_rate']:.4f} ± {results['std_win_rate']:.4f}")
    
    return results

def save_model(model, filename=None):
    """Сохраняем модель"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"trading_model_ppo_{timestamp}"
    
    model_path = f"./models/{filename}"
    model.save(model_path)
    
    print(f"💾 Модель сохранена в {model_path}")
    return model_path

def main():
    """Основная функция"""
    print("🤖 Обучение SAC модели на реальных данных BTC/USDT")
    print("=" * 60)
    
    try:
        # 1. Загружаем данные
        data = load_real_data()
        if data is None:
            return
        
        # 2. Создаём среду
        print("\n🎮 Создаём торговую среду...")
        env = TradingEnvironment(
            data=data,
            window_size=64,
            commission_rate=0.0004,
            slippage_rate=0.0001,
            initial_balance=10000.0,
            max_position_size=0.1
        )
        
        print(f"✅ Среда создана:")
        print(f"   - Размер наблюдения: {env.observation_space.shape}")
        print(f"   - Количество действий: {env.action_space.n}")
        print(f"   - Максимум шагов: {env.max_steps}")
        
        # 3. Обучаем модель
        model = train_ppo_model(env, total_timesteps=50000)  # Начинаем с малого
        
        # 4. Оцениваем модель
        results = evaluate_model(model, env, n_episodes=3)
        
        # 5. Сохраняем модель
        model_path = save_model(model)
        
        print("\n" + "=" * 60)
        print("🎉 Обучение PPO модели завершено успешно!")
        print(f"📁 Модель сохранена: {model_path}")
        print(f"📊 Результаты: Win Rate = {results['mean_win_rate']:.2f}")
        
        print("\n📋 Следующие шаги:")
        print("1. Протестировать модель на новых данных")
        print("2. Экспортировать в ONNX для Node.js")
        print("3. Создать Node.js бота")
        
    except Exception as e:
        print(f"\n❌ Ошибка при обучении: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
