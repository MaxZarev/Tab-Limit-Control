let tabLimit = 20;
let isBlinking = false;
let blinkInterval = null;

// Загрузка сохраненного лимита
chrome.storage.local.get(['tabLimit'], (result) => {
    if (chrome.runtime.lastError) {
        console.error('Ошибка при загрузке настроек:', chrome.runtime.lastError);
        return;
    }
    if (result.tabLimit && typeof result.tabLimit === 'number') {
        tabLimit = Math.min(Math.max(result.tabLimit, 1), 100);
    }
});

// Обновление лимита
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateTabLimit' && typeof message.limit === 'number') {
        tabLimit = Math.min(Math.max(message.limit, 1), 100);
        sendResponse({ success: true });
    }
    return true;
});

// Функция мигания иконки
function startBlinking() {
    if (!isBlinking) {
        isBlinking = true;
        let isVisible = true;
        
        const normalIcon = {
            '16': chrome.runtime.getURL('icons/icon16.png'),
            '48': chrome.runtime.getURL('icons/icon48.png'),
            '128': chrome.runtime.getURL('icons/icon128.png')
        };

        const alertIcon = {
            '16': chrome.runtime.getURL('icons/icon16_alert.png'),
            '48': chrome.runtime.getURL('icons/icon48_alert.png'),
            '128': chrome.runtime.getURL('icons/icon128_alert.png')
        };
        
        blinkInterval = setInterval(() => {
            chrome.action.setIcon({
                path: isVisible ? normalIcon : alertIcon
            });
            isVisible = !isVisible;
        }, 500);
    }
}

// Остановка мигания
function stopBlinking() {
    if (isBlinking) {
        clearInterval(blinkInterval);
        isBlinking = false;
        // Восстанавливаем стандартную иконку
        chrome.action.setIcon({
            path: {
                '16': chrome.runtime.getURL('icons/icon16.png'),
                '48': chrome.runtime.getURL('icons/icon48.png'),
                '128': chrome.runtime.getURL('icons/icon128.png')
            }
        });
    }
}

// Проверка количества вкладок
function checkTabLimit() {
    chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
            console.error('Ошибка при получении вкладок:', chrome.runtime.lastError);
            return;
        }

        if (tabs.length > tabLimit) {
            // Закрываем лишние вкладки
            const tabsToClose = tabs.slice(tabLimit);
            tabsToClose.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.remove(tab.id).catch(error => {
                        console.error('Ошибка при закрытии вкладки:', error);
                    });
                }
            });
        }
        
        // Обновление бейджа
        chrome.action.setBadgeText({ text: tabs.length.toString() }).catch(error => {
            console.error('Ошибка при обновлении бейджа:', error);
        });
        chrome.action.setBadgeBackgroundColor({ 
            color: tabs.length > tabLimit ? '#FF0000' : '#4CAF50' 
        }).catch(error => {
            console.error('Ошибка при обновлении цвета бейджа:', error);
        });

        // Управление миганием
        if (tabs.length === tabLimit - 1) {
            startBlinking();
        } else {
            stopBlinking();
        }
    });
}

// Отслеживание событий вкладок
chrome.tabs.onCreated.addListener(checkTabLimit);
chrome.tabs.onRemoved.addListener(checkTabLimit);
chrome.tabs.onUpdated.addListener(checkTabLimit); 