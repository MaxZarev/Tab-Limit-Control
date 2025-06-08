document.addEventListener('DOMContentLoaded', () => {
    const tabLimitInput = document.getElementById('tabLimit');
    const currentTabCount = document.getElementById('currentTabCount');
    const saveButton = document.getElementById('saveSettings');
    const openTabManagerButton = document.getElementById('openTabManager');
    const closeOtherTabsButton = document.getElementById('closeOtherTabs');
    const behaviorRadios = document.querySelectorAll('input[name="behavior"]');

    // Загрузка сохраненных настроек
    chrome.storage.local.get(['tabLimit', 'behaviorMode'], (result) => {
        if (result.tabLimit && typeof result.tabLimit === 'number') {
            tabLimitInput.value = Math.min(Math.max(result.tabLimit, 1), 100);
        }
        
        // Загружаем режим поведения (по умолчанию 'manager')
        const behaviorMode = result.behaviorMode || 'manager';
        const targetRadio = document.querySelector(`input[name="behavior"][value="${behaviorMode}"]`);
        if (targetRadio) {
            targetRadio.checked = true;
        }
    });

    // Обновление количества вкладок
    updateTabCount();

    // Сохранение настроек
    saveButton.addEventListener('click', () => {
        const limit = parseInt(tabLimitInput.value);
        const selectedBehavior = document.querySelector('input[name="behavior"]:checked')?.value || 'manager';
        
        if (!isNaN(limit) && limit >= 1 && limit <= 100) {
            chrome.storage.local.set({ 
                tabLimit: limit,
                behaviorMode: selectedBehavior 
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Ошибка при сохранении настроек:', chrome.runtime.lastError);
                    return;
                }
                
                // Отправляем обновленный лимит в background script
                chrome.runtime.sendMessage({ 
                    action: 'updateTabLimit', 
                    limit: limit,
                    behaviorMode: selectedBehavior
                });
                
                // Показываем уведомление об успешном сохранении
                showNotification('Настройки сохранены!');
            });
        }
    });

    // Открытие менеджера вкладок
    openTabManagerButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openTabManager' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Ошибка при открытии менеджера:', chrome.runtime.lastError);
                showNotification('Ошибка при открытии менеджера вкладок', 'error');
            } else {
                window.close(); // Закрываем popup
            }
        });
    });

    // Закрытие всех вкладок кроме текущей
    closeOtherTabsButton.addEventListener('click', () => {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('Ошибка при получении вкладок:', chrome.runtime.lastError);
                return;
            }

            chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
                if (chrome.runtime.lastError) {
                    console.error('Ошибка при получении активной вкладки:', chrome.runtime.lastError);
                    return;
                }

                const activeTab = activeTabs[0];
                if (!activeTab) return;

                const tabsToClose = tabs.filter(tab => tab.id !== activeTab.id);
                tabsToClose.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.remove(tab.id).catch(error => {
                            console.error('Ошибка при закрытии вкладки:', error);
                        });
                    }
                });
                
                showNotification(`Закрыто ${tabsToClose.length} вкладок`);
                
                // Обновляем счетчик через небольшую задержку
                setTimeout(updateTabCount, 500);
            });
        });
    });

    // Функция обновления счетчика вкладок
    function updateTabCount() {
        chrome.tabs.query({}, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('Ошибка при получении вкладок:', chrome.runtime.lastError);
                return;
            }
            currentTabCount.textContent = tabs.length;
            
            // Обновляем цвет счетчика в зависимости от лимита
            const limit = parseInt(tabLimitInput.value) || 20;
            const tabCountElement = currentTabCount.parentElement;
            
            if (tabs.length > limit) {
                tabCountElement.style.color = '#f44336';
                tabCountElement.style.fontWeight = 'bold';
            } else if (tabs.length === limit) {
                tabCountElement.style.color = '#ff9800';
                tabCountElement.style.fontWeight = 'bold';
            } else {
                tabCountElement.style.color = '#4CAF50';
                tabCountElement.style.fontWeight = 'normal';
            }
        });
    }

    // Функция показа уведомлений
    function showNotification(message, type = 'success') {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            background: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Убираем уведомление через 2 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Добавляем CSS анимации для уведомлений
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Обновляем счетчик при изменении лимита
    tabLimitInput.addEventListener('input', updateTabCount);

    // Периодически обновляем счетчик вкладок
    setInterval(updateTabCount, 2000);
}); 