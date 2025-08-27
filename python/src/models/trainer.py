import os
import sys
import logging
import numpy as np
import pandas as pd
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
from stable_baselines3 import SAC
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.monitor import Monitor
import torch
import onnx
import onnxruntime

# Добавляем путь к модулям
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from src.environment.trading_env import TradingEnvironment
from src.data.collector import BinanceDataCollector
from src.utils.config import Config

class TradingModelTrainer:
    """Тренер для обучения SAC модели трейдинга"""
    
    def __init__(self):
        self.logger = self._setup_logger()
        self.config = Config()
        self.model = None
        self.env = None
        self.eval_env = None
        
        # Создаём папки если их нет
        os.makedirs(self.config.MODEL_SAVE_PATH, exist_ok=True)
        os.makedirs(self.config.LOG_PATH, exist_ok=True)
        os.makedirs(self.config.DATA_PATH, exist_ok=True)
        
    def _setup_logger(self) -> logging.Logger:
        """Настройка логирования"""
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        
        # Создаём форматтер
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Файловый хендлер
        if not logger.handlers:
            file_handler = logging.FileHandler(f'{Config.LOG_PATH}/training.log')
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
            
            # Консольный хендлер
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        
        return logger
    
    def collect_data(self, symbols: list = None, timeframe: str = '1h') -> dict:
        """Сбор данных для обучения"""
        if symbols is None:
            symbols = [f"{symbol}/USDT" for symbol in self.config.TRADING_PAIRS]
        
        self.logger.info(f"Начинаем сбор данных для {symbols}")
        
        collector = BinanceDataCollector(testnet=self.config.BINANCE_TESTNET)
        
        # Получаем данные
        data = collector.get_multiple_symbols_data(
            symbols=symbols,
            timeframe=timeframe,
            start_date=self.config.TRAIN_START_DATE,
            end_date=self.config.TRAIN_END_DATE
        )
        
        # Сохраняем данные
        collector.save_data(data, format='parquet')
        
        self.logger.info(f"Собрано данных: {len(data)} символов")
        return data
    
    def prepare_environment(self, data: dict, symbol: str = 'BTC/USDT') -> TradingEnvironment:
        """Подготовка торговой среды"""
        if symbol not in data:
            raise ValueError(f"Символ {symbol} не найден в данных")
        
        df = data[symbol]
        self.logger.info(f"Подготавливаем среду для {symbol}, данных: {len(df)}")
        
        # Создаём среду
        env = TradingEnvironment(
            data=df,
            window_size=self.config.WINDOW_SIZE,
            commission_rate=self.config.COMMISSION_RATE,
            slippage_rate=self.config.SLIPPAGE_RATE,
            initial_balance=10000.0,
            max_position_size=0.1
        )
        
        return env
    
    def create_vec_env(self, env: TradingEnvironment) -> DummyVecEnv:
        """Создание векторной среды для Stable-Baselines3"""
        def make_env():
            return Monitor(env)
        
        return DummyVecEnv([make_env])
    
    def setup_callbacks(self, eval_env: DummyVecEnv) -> list:
        """Настройка колбэков для обучения"""
        callbacks = []
        
        # Колбэк для оценки
        eval_callback = EvalCallback(
            eval_env,
            best_model_save_path=f"{self.config.MODEL_SAVE_PATH}/best_model/",
            log_path=f"{self.config.LOG_PATH}/eval/",
            eval_freq=10000,
            deterministic=True,
            render=False
        )
        callbacks.append(eval_callback)
        
        # Колбэк для сохранения чекпоинтов
        checkpoint_callback = CheckpointCallback(
            save_freq=50000,
            save_path=f"{self.config.MODEL_SAVE_PATH}/checkpoints/",
            name_prefix="trading_model"
        )
        callbacks.append(checkpoint_callback)
        
        return callbacks
    
    def train_model(self, env: TradingEnvironment, total_timesteps: int = None) -> SAC:
        """Обучение SAC модели"""
        if total_timesteps is None:
            total_timesteps = self.config.TOTAL_TIMESTEPS
        
        self.logger.info(f"Начинаем обучение SAC модели на {total_timesteps} шагах")
        
        # Создаём векторную среду
        vec_env = self.create_vec_env(env)
        
        # Создаём модель
        model = SAC(
            "MlpPolicy",
            vec_env,
            verbose=1,
            learning_rate=self.config.LEARNING_RATE,
            batch_size=self.config.BATCH_SIZE,
            buffer_size=1000000,
            learning_starts=1000,
            tau=0.005,
            gamma=0.99,
            train_freq=1,
            gradient_steps=1,
            ent_coef="auto",
            target_entropy="auto",
            tensorboard_log=f"{self.config.LOG_PATH}/tensorboard/"
        )
        
        # Настраиваем колбэки
        callbacks = self.setup_callbacks(vec_env)
        
        # Обучаем модель
        self.logger.info("Начинаем обучение...")
        model.learn(
            total_timesteps=total_timesteps,
            callback=callbacks,
            progress_bar=True
        )
        
        self.logger.info("Обучение завершено!")
        return model
    
    def evaluate_model(self, model: SAC, env: TradingEnvironment, n_episodes: int = 10) -> dict:
        """Оценка обученной модели"""
        self.logger.info(f"Оцениваем модель на {n_episodes} эпизодах")
        
        total_rewards = []
        total_pnls = []
        win_rates = []
        
        for episode in range(n_episodes):
            obs, info = env.reset()
            episode_reward = 0
            done = False
            
            while not done:
                action, _ = model.predict(obs, deterministic=True)
                obs, reward, done, truncated, info = env.step(action)
                episode_reward += reward
            
            # Получаем статистику эпизода
            stats = env.get_statistics()
            total_rewards.append(episode_reward)
            total_pnls.append(stats.get('total_return', 0))
            win_rates.append(stats.get('win_rate', 0))
            
            self.logger.info(f"Эпизод {episode + 1}: Reward={episode_reward:.4f}, Return={stats.get('total_return', 0):.4f}, Win Rate={stats.get('win_rate', 0):.2f}")
        
        # Агрегируем результаты
        results = {
            'mean_reward': np.mean(total_rewards),
            'std_reward': np.std(total_rewards),
            'mean_return': np.mean(total_pnls),
            'std_return': np.std(total_pnls),
            'mean_win_rate': np.mean(win_rates),
            'std_win_rate': np.std(win_rates)
        }
        
        self.logger.info(f"Результаты оценки: {results}")
        return results
    
    def save_model(self, model: SAC, filename: str = None) -> str:
        """Сохранение модели"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"trading_model_sac_{timestamp}"
        
        # Сохраняем в формате Stable-Baselines3
        model_path = f"{self.config.MODEL_SAVE_PATH}{filename}"
        model.save(model_path)
        
        self.logger.info(f"Модель сохранена в {model_path}")
        return model_path
    
    def export_to_onnx(self, model: SAC, filename: str = None) -> str:
        """Экспорт модели в ONNX формат"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"trading_model_{timestamp}.onnx"
        
        onnx_path = f"{self.config.MODEL_SAVE_PATH}{filename}"
        
        # Создаём dummy input для экспорта
        dummy_input = torch.randn(1, self.config.WINDOW_SIZE * 5 + 2)
        
        # Экспортируем в ONNX
        torch.onnx.export(
            model.policy.actor,
            dummy_input,
            onnx_path,
            export_params=True,
            opset_version=11,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        )
        
        self.logger.info(f"Модель экспортирована в ONNX: {onnx_path}")
        return onnx_path
    
    def plot_training_results(self, model: SAC, env: TradingEnvironment):
        """Визуализация результатов обучения"""
        # Тестируем модель
        obs, info = env.reset()
        done = False
        prices = []
        positions = []
        balances = []
        pnls = []
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, done, truncated, info = env.step(action)
            
            prices.append(info['current_price'])
            positions.append(info['position'])
            balances.append(info['balance'])
            pnls.append(info['total_pnl'])
        
        # Создаём графики
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # График цен
        axes[0, 0].plot(prices)
        axes[0, 0].set_title('Цена актива')
        axes[0, 0].set_ylabel('Цена')
        
        # График позиций
        axes[0, 1].plot(positions)
        axes[0, 1].set_title('Позиция')
        axes[0, 1].set_ylabel('Размер позиции')
        
        # График баланса
        axes[1, 0].plot(balances)
        axes[1, 0].set_title('Баланс')
        axes[1, 0].set_ylabel('Баланс')
        
        # График PnL
        axes[1, 1].plot(pnls)
        axes[1, 1].set_title('Общий PnL')
        axes[1, 1].set_ylabel('PnL')
        
        plt.tight_layout()
        
        # Сохраняем график
        plot_path = f"{self.config.LOG_PATH}/training_results.png"
        plt.savefig(plot_path)
        self.logger.info(f"График сохранён в {plot_path}")
        
        plt.show()

def main():
    """Основная функция для обучения"""
    trainer = TradingModelTrainer()
    
    try:
        # 1. Собираем данные
        trainer.logger.info("=== СБОР ДАННЫХ ===")
        data = trainer.collect_data(['BTC/USDT'], '1h')
        
        # 2. Подготавливаем среду
        trainer.logger.info("=== ПОДГОТОВКА СРЕДЫ ===")
        env = trainer.prepare_environment(data, 'BTC/USDT')
        
        # 3. Обучаем модель
        trainer.logger.info("=== ОБУЧЕНИЕ МОДЕЛИ ===")
        model = trainer.train_model(env, total_timesteps=100000)  # Начинаем с малого количества
        
        # 4. Оцениваем модель
        trainer.logger.info("=== ОЦЕНКА МОДЕЛИ ===")
        results = trainer.evaluate_model(model, env, n_episodes=5)
        
        # 5. Сохраняем модель
        trainer.logger.info("=== СОХРАНЕНИЕ МОДЕЛИ ===")
        model_path = trainer.save_model(model)
        
        # 6. Экспортируем в ONNX
        trainer.logger.info("=== ЭКСПОРТ В ONNX ===")
        onnx_path = trainer.export_to_onnx(model)
        
        # 7. Визуализируем результаты
        trainer.logger.info("=== ВИЗУАЛИЗАЦИЯ ===")
        trainer.plot_training_results(model, env)
        
        trainer.logger.info("=== ОБУЧЕНИЕ ЗАВЕРШЕНО УСПЕШНО! ===")
        trainer.logger.info(f"Модель сохранена: {model_path}")
        trainer.logger.info(f"ONNX модель: {onnx_path}")
        
    except Exception as e:
        trainer.logger.error(f"Ошибка при обучении: {str(e)}")
        raise

if __name__ == "__main__":
    main()
