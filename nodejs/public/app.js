/**
 * 🤖 JavaScript для управления ИИ-Трейдинг Ботом
 */

class TradingBotUI {
    constructor() {
        this.apiBase = '/api/v1';
        this.updateInterval = null;
        this.init();
    }

    /**
     * Инициализация интерфейса
     */
    init() {
        this.bindEvents();
        this.loadInitialData();
        this.startAutoUpdate();
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        // Обработчики уже добавлены в HTML через onclick
        console.log('🎯 ИИ-Трейдинг Бот UI инициализирован');
    }

    /**
     * Загрузка начальных данных
     */
    async loadInitialData() {
        try {
            await this.updateBotStatus();
            await this.updateTradingStats();
            await this.updatePositions();
            await this.updateTrades();
        } catch (error) {
            console.error('❌ Ошибка загрузки начальных данных:', error);
            this.showAlert('Ошибка загрузки данных', 'error');
        }
    }

    /**
     * Запуск автоматического обновления
     */
    startAutoUpdate() {
        this.updateInterval = setInterval(async () => {
            try {
                await this.updateBotStatus();
                await this.updateTradingStats();
            } catch (error) {
                console.error('❌ Ошибка автоматического обновления:', error);
            }
        }, 5000); // каждые 5 секунд
    }

    /**
     * Остановка автоматического обновления
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Запуск бота
     */
    async startBot() {
        try {
            this.setLoadingState('startBtn', true);
            
            const response = await fetch(`${this.apiBase}/control/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('✅ Бот успешно запущен!', 'success');
                await this.updateBotStatus();
                this.updateButtonStates(true);
            } else {
                this.showAlert(`❌ Ошибка запуска: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка запуска бота:', error);
            this.showAlert('❌ Ошибка запуска бота', 'error');
        } finally {
            this.setLoadingState('startBtn', false);
        }
    }

    /**
     * Остановка бота
     */
    async stopBot() {
        try {
            this.setLoadingState('stopBtn', true);
            
            const response = await fetch(`${this.apiBase}/control/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('🛑 Бот остановлен!', 'success');
                await this.updateBotStatus();
                this.updateButtonStates(false);
            } else {
                this.showAlert(`❌ Ошибка остановки: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка остановки бота:', error);
            this.showAlert('❌ Ошибка остановки бота', 'error');
        } finally {
            this.setLoadingState('stopBtn', false);
        }
    }

    /**
     * Экстренная остановка
     */
    async emergencyStop() {
        if (!confirm('🚨 ВНИМАНИЕ! Это экстренная остановка. Все позиции будут принудительно закрыты. Продолжить?')) {
            return;
        }

        try {
            this.setLoadingState('emergencyBtn', true);
            
            const response = await fetch(`${this.apiBase}/control/emergency-stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('🚨 Экстренная остановка выполнена!', 'warning');
                await this.updateBotStatus();
                this.updateButtonStates(false);
            } else {
                this.showAlert(`❌ Ошибка экстренной остановки: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка экстренной остановки:', error);
            this.showAlert('❌ Ошибка экстренной остановки', 'error');
        } finally {
            this.setLoadingState('emergencyBtn', false);
        }
    }

    /**
     * Переключение режима торговли
     */
    async toggleTrading(enabled) {
        try {
            const response = await fetch(`${this.apiBase}/control/trading`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert(`📊 Торговля ${enabled ? 'включена' : 'выключена'}`, 'success');
                await this.updateBotStatus();
            } else {
                this.showAlert(`❌ Ошибка изменения режима: ${result.message}`, 'error');
                // Возвращаем переключатель в предыдущее состояние
                document.getElementById('tradingToggle').checked = !enabled;
            }
        } catch (error) {
            console.error('❌ Ошибка переключения торговли:', error);
            this.showAlert('❌ Ошибка переключения торговли', 'error');
            // Возвращаем переключатель в предыдущее состояние
            document.getElementById('tradingToggle').checked = !enabled;
        }
    }

    /**
     * Обновление статуса бота
     */
    async updateBotStatus() {
        try {
            const response = await fetch(`${this.apiBase}/control/status`);
            const result = await response.json();

            if (response.ok && result.botStatus) {
                const status = result.botStatus;
                this.updateStatusIndicator(status.isRunning);
                this.updateButtonStates(status.isRunning);
                this.updateUptime(status.uptime);
                this.updateRiskLevel(status.riskLevel);
                this.updateTradingToggle(status.isTrading);
            }
        } catch (error) {
            console.error('❌ Ошибка обновления статуса бота:', error);
        }
    }

    /**
     * Обновление торговой статистики
     */
    async updateTradingStats() {
        try {
            const response = await fetch(`${this.apiBase}/status/trading`);
            const result = await response.json();

            if (response.ok) {
                this.updateTotalPnL(result.lastPerformance?.total_pnl || 0);
                this.updateWinRate(result.lastPerformance?.win_rate || 0);
                this.updateTotalTrades(result.lastPerformance?.total_trades || 0);
                this.updateOpenPositions(result.openPositions || 0);
            }
        } catch (error) {
            console.error('❌ Ошибка обновления торговой статистики:', error);
        }
    }

    /**
     * Обновление позиций
     */
    async updatePositions() {
        try {
            const response = await fetch(`${this.apiBase}/trading/positions`);
            const result = await response.json();

            if (response.ok) {
                this.renderPositions(result.positions || []);
            }
        } catch (error) {
            console.error('❌ Ошибка обновления позиций:', error);
        }
    }

    /**
     * Обновление сделок
     */
    async updateTrades() {
        try {
            const response = await fetch(`${this.apiBase}/trading/trades`);
            const result = await response.json();

            if (response.ok) {
                this.renderTrades(result.trades || []);
            }
        } catch (error) {
            console.error('❌ Ошибка обновления сделок:', error);
        }
    }

    /**
     * Обновление индикатора статуса
     */
    updateStatusIndicator(isRunning) {
        const indicator = document.getElementById('botStatusIndicator');
        indicator.className = 'status-indicator';
        
        if (isRunning) {
            indicator.classList.add('status-running');
        } else {
            indicator.classList.add('status-stopped');
        }
    }

    /**
     * Обновление состояния кнопок
     */
    updateButtonStates(isRunning) {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const emergencyBtn = document.getElementById('emergencyBtn');

        startBtn.disabled = isRunning;
        stopBtn.disabled = !isRunning;
        emergencyBtn.disabled = !isRunning;
    }

    /**
     * Обновление времени работы
     */
    updateUptime(uptimeMs) {
        const uptimeElement = document.getElementById('uptimeValue');
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            uptimeElement.textContent = `${hours}ч ${minutes % 60}м`;
        } else if (minutes > 0) {
            uptimeElement.textContent = `${minutes}м ${seconds % 60}с`;
        } else {
            uptimeElement.textContent = `${seconds}с`;
        }
    }

    /**
     * Обновление уровня риска
     */
    updateRiskLevel(riskLevel) {
        const riskElement = document.getElementById('riskLevel');
        riskElement.textContent = riskLevel;
        
        // Добавляем цветовое кодирование
        riskElement.className = 'metric-value';
        if (riskLevel === 'CRITICAL') {
            riskElement.style.color = '#dc3545';
        } else if (riskLevel === 'HIGH') {
            riskElement.style.color = '#ffc107';
        } else if (riskLevel === 'MEDIUM') {
            riskElement.style.color = '#fd7e14';
        } else if (riskLevel === 'LOW') {
            riskElement.style.color = '#28a745';
        }
    }

    /**
     * Обновление переключателя торговли
     */
    updateTradingToggle(isTrading) {
        const toggle = document.getElementById('tradingToggle');
        toggle.checked = isTrading;
    }

    /**
     * Обновление общего PnL
     */
    updateTotalPnL(pnl) {
        const pnlElement = document.getElementById('totalPnL');
        const formattedPnL = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(pnl);
        
        pnlElement.textContent = formattedPnL;
        pnlElement.style.color = pnl >= 0 ? '#28a745' : '#dc3545';
    }

    /**
     * Обновление Win Rate
     */
    updateWinRate(winRate) {
        const winRateElement = document.getElementById('winRate');
        winRateElement.textContent = `${(winRate * 100).toFixed(1)}%`;
    }

    /**
     * Обновление общего количества сделок
     */
    updateTotalTrades(totalTrades) {
        const tradesElement = document.getElementById('totalTrades');
        tradesElement.textContent = totalTrades;
    }

    /**
     * Обновление открытых позиций
     */
    updateOpenPositions(openPositions) {
        const positionsElement = document.getElementById('openPositions');
        positionsElement.textContent = openPositions;
    }

    /**
     * Рендеринг позиций
     */
    renderPositions(positions) {
        const container = document.getElementById('positionsContainer');
        
        if (positions.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-info-circle"></i> Нет открытых позиций
                </p>
            `;
            return;
        }

        const table = `
            <table class="positions-table">
                <thead>
                    <tr>
                        <th>Символ</th>
                        <th>Сторона</th>
                        <th>Количество</th>
                        <th>Цена входа</th>
                        <th>Текущая цена</th>
                        <th>PnL</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${positions.map(pos => `
                        <tr>
                            <td><strong>${pos.symbol}</strong></td>
                            <td><span style="color: ${pos.side === 'BUY' ? '#28a745' : '#dc3545'}">${pos.side}</span></td>
                            <td>${pos.quantity}</td>
                            <td>$${parseFloat(pos.entry_price).toFixed(2)}</td>
                            <td>$${parseFloat(pos.current_price || pos.entry_price).toFixed(2)}</td>
                            <td style="color: ${parseFloat(pos.pnl || 0) >= 0 ? '#28a745' : '#dc3545'}">$${parseFloat(pos.pnl || 0).toFixed(2)}</td>
                            <td><span class="badge badge-${pos.status === 'OPEN' ? 'success' : 'secondary'}">${pos.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    }

    /**
     * Рендеринг сделок
     */
    renderTrades(trades) {
        const container = document.getElementById('tradesContainer');
        
        if (trades.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #666; padding: 20px;">
                    <i class="fas fa-info-circle"></i> Нет сделок
                </p>
            `;
            return;
        }

        const table = `
            <table class="positions-table">
                <thead>
                    <tr>
                        <th>Время</th>
                        <th>Символ</th>
                        <th>Сторона</th>
                        <th>Количество</th>
                        <th>Цена</th>
                        <th>Статус</th>
                        <th>PnL</th>
                    </tr>
                </thead>
                <tbody>
                    ${trades.slice(0, 10).map(trade => `
                        <tr>
                            <td>${new Date(trade.timestamp).toLocaleString()}</td>
                            <td><strong>${trade.symbol}</strong></td>
                            <td><span style="color: ${trade.side === 'BUY' ? '#28a745' : '#dc3545'}">${trade.side}</span></td>
                            <td>${trade.quantity}</td>
                            <td>$${parseFloat(trade.price).toFixed(2)}</td>
                            <td><span class="badge badge-${trade.status === 'FILLED' ? 'success' : 'warning'}">${trade.status}</span></td>
                            <td style="color: ${parseFloat(trade.pnl || 0) >= 0 ? '#28a745' : '#dc3545'}">$${parseFloat(trade.pnl || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    }

    /**
     * Установка состояния загрузки для кнопки
     */
    setLoadingState(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        const originalText = button.innerHTML;
        
        if (isLoading) {
            button.innerHTML = '<div class="loading"></div>';
            button.disabled = true;
        } else {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    /**
     * Показ уведомления
     */
    showAlert(message, type = 'info') {
        const alertElement = document.getElementById(`alert${type.charAt(0).toUpperCase() + type.slice(1)}`);
        
        if (alertElement) {
            alertElement.textContent = message;
            alertElement.style.display = 'block';
            
            // Автоматически скрываем через 5 секунд
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Глобальные функции для HTML onclick
function startBot() {
    window.tradingBotUI.startBot();
}

function stopBot() {
    window.tradingBotUI.stopBot();
}

function emergencyStop() {
    window.tradingBotUI.emergencyStop();
}

function toggleTrading(enabled) {
    window.tradingBotUI.toggleTrading(enabled);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.tradingBotUI = new TradingBotUI();
});




