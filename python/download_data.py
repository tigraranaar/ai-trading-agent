#!/usr/bin/env python3
"""
Скрипт для скачивания исторических данных с Binance (без API ключей)
Используем публичные данные для обучения модели
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
import os

def download_binance_data(symbol='BTCUSDT', interval='1h', start_date='2020-01-01', end_date='2024-12-31'):
    """
    Скачиваем исторические данные с Binance публичного API
    
    Args:
        symbol: Торговая пара (например, 'BTCUSDT')
        interval: Временной интервал ('1m', '5m', '15m', '1h', '4h', '1d')
        start_date: Дата начала в формате 'YYYY-MM-DD'
        end_date: Дата окончания в формате 'YYYY-MM-DD'
    """
    
    print(f"📊 Скачиваем данные для {symbol} с {start_date} по {end_date}")
    print(f"⏱️ Интервал: {interval}")
    
    # Преобразуем даты в timestamp
    start_ts = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp() * 1000)
    end_ts = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp() * 1000)
    
    # URL для публичного API Binance
    base_url = "https://api.binance.com/api/v3/klines"
    
    all_data = []
    current_ts = start_ts
    
    # Binance API возвращает максимум 1000 свечей за запрос
    limit = 1000
    
    while current_ts < end_ts:
        # Параметры запроса
        params = {
            'symbol': symbol,
            'interval': interval,
            'startTime': current_ts,
            'limit': limit
        }
        
        try:
            print(f"⏳ Загружаем данные с {datetime.fromtimestamp(current_ts/1000)}...")
            
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if not data:
                print("📭 Больше данных нет")
                break
            
            all_data.extend(data)
            
            # Обновляем timestamp для следующего запроса
            current_ts = data[-1][0] + 1
            
            # Пауза между запросами (чтобы не перегружать API)
            time.sleep(0.1)
            
            print(f"✅ Загружено {len(data)} свечей")
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Ошибка при загрузке: {e}")
            break
        except Exception as e:
            print(f"❌ Неожиданная ошибка: {e}")
            break
    
    if not all_data:
        print("❌ Не удалось загрузить данные")
        return None
    
    print(f"🎉 Всего загружено {len(all_data)} свечей")
    
    # Преобразуем в DataFrame
    df = pd.DataFrame(all_data, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_asset_volume', 'number_of_trades',
        'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
    ])
    
    # Обрабатываем данные
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df = df.set_index('timestamp')
    
    # Конвертируем в числовые типы
    numeric_columns = ['open', 'high', 'low', 'close', 'volume']
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Фильтруем по датам
    df = df[(df.index >= pd.to_datetime(start_date)) & 
            (df.index <= pd.to_datetime(end_date))]
    
    # Убираем лишние колонки, оставляем только OHLCV
    df = df[['open', 'high', 'low', 'close', 'volume']]
    
    print(f"📈 Диапазон цен: {df['close'].min():.2f} - {df['close'].max():.2f}")
    print(f"📅 Период: {df.index.min()} - {df.index.max()}")
    
    return df

def save_data(df, symbol='BTCUSDT', interval='1h', start_date='2020-01-01', end_date='2024-12-31'):
    """Сохраняем данные в файл"""
    
    # Создаём папку data если её нет
    os.makedirs('data', exist_ok=True)
    
    # Имя файла (только CSV)
    csv_filename = f"data/{symbol}_{interval}_{start_date}_{end_date}.csv"
    
    # Сохраняем в CSV
    df.to_csv(csv_filename)
    print(f"💾 Данные сохранены в {csv_filename}")
    
    return csv_filename

def main():
    """Основная функция"""
    print("🚀 Скачивание исторических данных Binance")
    print("=" * 50)
    
    # Параметры
    symbol = 'BTCUSDT'
    interval = '1h'  # 1 час - хороший баланс между детализацией и размером
    start_date = '2020-01-01'
    end_date = '2024-12-31'
    
    try:
        # Скачиваем данные
        df = download_binance_data(symbol, interval, start_date, end_date)
        
        if df is not None:
            # Сохраняем данные
            save_data(df, symbol, interval, start_date, end_date)
            
            # Показываем статистику
            print("\n📊 Статистика данных:")
            print(f"Количество свечей: {len(df)}")
            print(f"Средняя цена: {df['close'].mean():.2f}")
            print(f"Волатильность: {df['close'].pct_change().std():.4f}")
            print(f"Средний объём: {df['volume'].mean():.2f}")
            
            # Показываем первые и последние данные
            print("\n📈 Первые 5 свечей:")
            print(df.head())
            
            print("\n📉 Последние 5 свечей:")
            print(df.tail())
            
            print("\n✅ Данные успешно загружены и готовы для обучения!")
            
        else:
            print("❌ Не удалось загрузить данные")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
