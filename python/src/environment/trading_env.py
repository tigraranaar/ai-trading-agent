import gymnasium as gym
import numpy as np
import pandas as pd
from gymnasium import spaces
from typing import Dict, List, Tuple, Optional, Any
import logging
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from src.utils.config import Config

class TradingEnvironment(gym.Env):
    """
    Reinforcement Learning среда для трейдинга криптовалютой
    
    Состояние: OHLCV данные за последние N свечей + текущая позиция
    Действие: [-1, 0, 1] где -1 = SELL, 0 = HOLD, 1 = BUY
    Награда: изменение PnL с учётом комиссий и проскальзывания
    """
    
    def __init__(
        self,
        data: pd.DataFrame,
        window_size: int = 64,
        commission_rate: float = 0.0004,
        slippage_rate: float = 0.0001,
        initial_balance: float = 10000.0,
        max_position_size: float = 0.1
    ):
        super().__init__()
        
        self.data = data
        self.window_size = window_size
        self.commission_rate = commission_rate
        self.slippage_rate = slippage_rate
        self.initial_balance = initial_balance
        self.max_position_size = max_position_size
        
        # Индексы для навигации по данным
        self.current_step = window_size
        self.max_steps = len(data) - window_size - 1
        
        # Торговые параметры
        self.balance = initial_balance
        self.position = 0.0  # -1 до 1, где 0 = нет позиции
        self.entry_price = 0.0
        self.total_pnl = 0.0
        self.trades_count = 0
        
        # Логирование
        self.logger = self._setup_logger()
        
        # Определяем пространства состояний и действий
        self.observation_space = self._get_observation_space()
        self.action_space = self._get_action_space()
        
        # История для анализа
        self.trade_history = []
        self.pnl_history = []
        
    def _setup_logger(self) -> logging.Logger:
        """Настройка логирования"""
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _get_observation_space(self) -> spaces.Box:
        """Определение пространства состояний"""
        # OHLCV данные + текущая позиция + баланс
        obs_size = self.window_size * 5 + 2  # 5 фичей OHLCV + позиция + баланс
        return spaces.Box(
            low=-np.inf, 
            high=np.inf, 
            shape=(obs_size,), 
            dtype=np.float32
        )
    
    def _get_action_space(self) -> spaces.Discrete:
        """Определение пространства действий"""
        # 0 = HOLD, 1 = BUY, 2 = SELL
        return spaces.Discrete(3)
    
    def _get_observation(self) -> np.ndarray:
        """Получение текущего состояния"""
        # Получаем OHLCV данные за последние window_size свечей
        current_data = self.data.iloc[self.current_step - self.window_size:self.current_step]
        
        # Нормализуем данные (log returns для цен, z-score для объёма)
        obs = []
        
        for i in range(self.window_size):
            if i == 0:
                # Первая свеча - используем абсолютные значения
                obs.extend([
                    current_data.iloc[i]['open'],
                    current_data.iloc[i]['high'],
                    current_data.iloc[i]['low'],
                    current_data.iloc[i]['close'],
                    current_data.iloc[i]['volume']
                ])
            else:
                # Остальные свечи - используем относительные изменения
                prev_close = current_data.iloc[i-1]['close']
                curr_close = current_data.iloc[i]['close']
                
                obs.extend([
                    np.log(curr_close / prev_close),  # log return для open
                    np.log(current_data.iloc[i]['high'] / prev_close),
                    np.log(current_data.iloc[i]['low'] / prev_close),
                    np.log(curr_close / prev_close),
                    (current_data.iloc[i]['volume'] - current_data.iloc[i-1]['volume']) / current_data.iloc[i-1]['volume']  # относительное изменение объёма
                ])
        
        # Добавляем текущую позицию и баланс
        obs.extend([self.position, self.balance / self.initial_balance])
        
        return np.array(obs, dtype=np.float32)
    
    def _calculate_reward(self, action: int) -> float:
        """Расчёт награды за действие"""
        if self.current_step >= len(self.data) - 1:
            return 0.0
        
        current_price = self.data.iloc[self.current_step]['close']
        next_price = self.data.iloc[self.current_step + 1]['close']
        
        reward = 0.0
        
        # Если есть открытая позиция, считаем PnL
        if self.position != 0:
            if self.position > 0:  # Long позиция
                pnl = (next_price - current_price) / current_price
            else:  # Short позиция
                pnl = (current_price - next_price) / current_price
            
            # Учитываем размер позиции
            pnl *= abs(self.position)
            reward += pnl
            
            # Штраф за комиссии
            commission = abs(self.position) * self.commission_rate
            reward -= commission
            
            # Штраф за проскальзывание
            slippage = abs(self.position) * self.slippage_rate
            reward -= slippage
        
        # Штраф за частые сделки (если действие != HOLD)
        if action != 0:
            reward -= 0.0001  # Небольшой штраф за активность
        
        return reward
    
    def _execute_action(self, action: int) -> None:
        """Исполнение действия"""
        current_price = self.data.iloc[self.current_step]['close']
        
        if action == 0:  # HOLD
            return
        
        elif action == 1:  # BUY
            if self.position < self.max_position_size:
                # Закрываем short позицию если есть
                if self.position < 0:
                    self._close_position(current_price)
                
                # Открываем long позицию
                new_position = min(self.max_position_size, self.max_position_size - self.position)
                self.position += new_position
                self.entry_price = current_price
                self.trades_count += 1
                
                self.logger.info(f"BUY: {new_position:.4f} по цене {current_price:.2f}")
        
        elif action == 2:  # SELL
            if self.position > -self.max_position_size:
                # Закрываем long позицию если есть
                if self.position > 0:
                    self._close_position(current_price)
                
                # Открываем short позицию
                new_position = min(self.max_position_size, self.max_position_size + self.position)
                self.position -= new_position
                self.entry_price = current_price
                self.trades_count += 1
                
                self.logger.info(f"SELL: {new_position:.4f} по цене {current_price:.2f}")
    
    def _close_position(self, price: float) -> None:
        """Закрытие позиции"""
        if self.position != 0:
            # Рассчитываем PnL
            if self.position > 0:  # Long
                pnl = (price - self.entry_price) / self.entry_price * abs(self.position)
            else:  # Short
                pnl = (self.entry_price - price) / self.entry_price * abs(self.position)
            
            self.total_pnl += pnl
            self.balance += pnl
            
            # Записываем сделку в историю
            self.trade_history.append({
                'entry_price': self.entry_price,
                'exit_price': price,
                'position': self.position,
                'pnl': pnl,
                'step': self.current_step
            })
            
            self.logger.info(f"Закрыта позиция: PnL = {pnl:.4f}, Баланс = {self.balance:.2f}")
            
            # Сбрасываем позицию
            self.position = 0.0
            self.entry_price = 0.0
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """Выполнение шага в среде"""
        # Проверяем валидность действия
        if not self.action_space.contains(action):
            action = 0  # HOLD если действие невалидно
        
        # Исполняем действие
        self._execute_action(action)
        
        # Рассчитываем награду
        reward = self._calculate_reward(action)
        
        # Переходим к следующему шагу
        self.current_step += 1
        
        # Проверяем завершение эпизода
        done = self.current_step >= self.max_steps
        
        # Получаем новое состояние
        observation = self._get_observation()
        
        # Дополнительная информация
        info = {
            'balance': self.balance,
            'position': self.position,
            'total_pnl': self.total_pnl,
            'trades_count': self.trades_count,
            'current_price': self.data.iloc[self.current_step - 1]['close'] if self.current_step > 0 else 0.0
        }
        
        # Записываем PnL в историю
        self.pnl_history.append(self.total_pnl)
        
        return observation, reward, done, False, info
    
    def reset(self, seed: Optional[int] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Сброс среды к начальному состоянию"""
        super().reset(seed=seed)
        
        # Сбрасываем торговые параметры
        self.current_step = self.window_size
        self.balance = self.initial_balance
        self.position = 0.0
        self.entry_price = 0.0
        self.total_pnl = 0.0
        self.trades_count = 0
        
        # Очищаем историю
        self.trade_history = []
        self.pnl_history = []
        
        # Получаем начальное состояние
        observation = self._get_observation()
        
        info = {
            'balance': self.balance,
            'position': self.position,
            'total_pnl': self.total_pnl,
            'trades_count': self.trades_count
        }
        
        return observation, info
    
    def render(self):
        """Визуализация состояния (для отладки)"""
        current_price = self.data.iloc[self.current_step - 1]['close'] if self.current_step > 0 else 0.0
        
        print(f"Шаг: {self.current_step}")
        print(f"Цена: {current_price:.2f}")
        print(f"Позиция: {self.position:.4f}")
        print(f"Баланс: {self.balance:.2f}")
        print(f"Общий PnL: {self.total_pnl:.4f}")
        print(f"Количество сделок: {self.trades_count}")
        print("-" * 50)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Получение статистики торговли"""
        if not self.pnl_history:
            return {}
        
        returns = np.diff(self.pnl_history)
        
        if len(returns) == 0:
            return {}
        
        # Базовые метрики
        total_return = (self.balance - self.initial_balance) / self.initial_balance
        sharpe_ratio = np.mean(returns) / (np.std(returns) + 1e-8) * np.sqrt(252)  # Годовой Sharpe
        max_drawdown = np.min(self.pnl_history) - self.initial_balance
        
        # Win rate
        winning_trades = sum(1 for trade in self.trade_history if trade['pnl'] > 0)
        total_trades = len(self.trade_history)
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        return {
            'total_return': total_return,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'win_rate': win_rate,
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'final_balance': self.balance,
            'initial_balance': self.initial_balance
        }
