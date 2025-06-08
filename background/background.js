let tabLimit = 20;
let isBlinking = false;
let blinkInterval = null;
let pendingTabUrl = null; // URL новой вкладки, ожидающей открытия
let isTabManagerOpen = false; // Флаг открытого менеджера вкладок

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

// Обработка сообщений
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateTabLimit' && typeof message.limit === 'number') {
        tabLimit = Math.min(Math.max(message.limit, 1), 100);
        
        // Сохраняем настройки поведения
        if (message.behaviorMode) {
            chrome.storage.local.set({ behaviorMode: message.behaviorMode });
        }
        
        sendResponse({ success: true });
    }
    
    // Ручное открытие менеджера вкладок из popup
    if (message.action === 'openTabManager') {
        openTabManager();
        sendResponse({ success: true });
    }
    
    // Обработка сообщений от tab-manager
    if (message.action === 'tabsClosedProceedWithNew') {
        handleTabsClosedProceed(message.pendingUrl);
        sendResponse({ success: true });
    }
    
    if (message.action === 'cancelNewTab') {
        handleCancelNewTab(message.pendingUrl);
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

// Открытие менеджера вкладок
async function openTabManager(newTabUrl = null, newTabId = null) {
    if (isTabManagerOpen) {
        console.log('Менеджер вкладок уже открыт');
        return;
    }
    
    try {
        // Сохраняем URL новой вкладки
        if (newTabUrl) {
            pendingTabUrl = newTabUrl;
            await chrome.storage.local.set({ pendingUrl: newTabUrl });
        }
        
        // Сохраняем ID новой вкладки для подсветки
        if (newTabId) {
            await chrome.storage.local.set({ 
                newTabId: newTabId,
                newTabUrl: newTabUrl || 'about:blank',
                newTabTitle: newTabUrl && newTabUrl !== 'about:blank' ? 'Загружается...' : 'Новая вкладка'
            });
        }
        
        // Открываем вкладку с менеджером вкладок
        const tab = await chrome.tabs.create({
            url: chrome.runtime.getURL('tab-manager/tab-manager.html'),
            active: true
        });
        
        isTabManagerOpen = true;
        
        // Отслеживаем закрытие вкладки менеджера
        chrome.tabs.onRemoved.addListener(function tabRemovedListener(tabId) {
            if (tabId === tab.id) {
                isTabManagerOpen = false;
                chrome.tabs.onRemoved.removeListener(tabRemovedListener);
                // Очищаем ID новой вкладки из storage
                chrome.storage.local.remove(['newTabId', 'newTabUrl', 'newTabTitle']);
            }
        });
        
    } catch (error) {
        console.error('Ошибка при открытии менеджера вкладок:', error);
        isTabManagerOpen = false;
    }
}

// Обработка завершения закрытия вкладок
async function handleTabsClosedProceed(url) {
    isTabManagerOpen = false;
    
    if (url && url !== 'about:blank') {
        try {
            // Открываем новую вкладку с сохраненным URL
            await chrome.tabs.create({ url: url });
        } catch (error) {
            console.error('Ошибка при открытии новой вкладки:', error);
        }
    }
    
    // Очищаем pending URL
    pendingTabUrl = null;
    await chrome.storage.local.remove(['pendingUrl']);
}

// Обработка отмены открытия новой вкладки
async function handleCancelNewTab(url) {
    isTabManagerOpen = false;
    
    // Очищаем pending URL
    pendingTabUrl = null;
    await chrome.storage.local.remove(['pendingUrl']);
    
    console.log('Открытие новой вкладки отменено пользователем');
}

// Фильтрация служебных вкладок расширения
function filterExtensionTabs(tabs) {
    const extensionUrls = [
        chrome.runtime.getURL('tab-manager/tab-manager.html'),
        chrome.runtime.getURL('popup/popup.html')
    ];
    
    return tabs.filter(tab => {
        return !extensionUrls.some(url => tab.url && tab.url.startsWith(url));
    });
}

// Проверка количества вкладок
function checkTabLimit() {
    chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
            console.error('Ошибка при получении вкладок:', chrome.runtime.lastError);
            return;
        }

        // Фильтруем служебные вкладки расширения
        const userTabs = filterExtensionTabs(tabs);
        const userTabsCount = userTabs.length;

        // Если превышен лимит и менеджер еще не открыт
        if (userTabsCount > tabLimit && !isTabManagerOpen) {
            console.log(`Превышен лимит вкладок: ${userTabsCount} > ${tabLimit}`);
            
            // Открываем менеджер вкладок вместо автоматического закрытия
            openTabManager();
        }
        
        // Обновление бейджа (показываем количество пользовательских вкладок)
        chrome.action.setBadgeText({ text: userTabsCount.toString() }).catch(error => {
            console.error('Ошибка при обновлении бейджа:', error);
        });
        chrome.action.setBadgeBackgroundColor({ 
            color: userTabsCount > tabLimit ? '#FF0000' : '#4CAF50' 
        }).catch(error => {
            console.error('Ошибка при обновлении цвета бейджа:', error);
        });

        // Управление миганием
        if (userTabsCount === tabLimit - 1) {
            startBlinking();
        } else {
            stopBlinking();
        }
    });
}

// Перехват создания новых вкладок
chrome.tabs.onCreated.addListener((tab) => {
    // Проверяем, не превышен ли лимит
    chrome.tabs.query({}, (allTabs) => {
        if (chrome.runtime.lastError) {
            console.error('Ошибка при получении вкладок:', chrome.runtime.lastError);
            return;
        }

        // Фильтруем служебные вкладки расширения (включая новую вкладку, если она служебная)
        const userTabs = filterExtensionTabs(allTabs);
        const userTabsCount = userTabs.length;

        // Проверяем, является ли новая вкладка служебной вкладкой расширения
        const extensionUrls = [
            chrome.runtime.getURL('tab-manager/tab-manager.html'),
            chrome.runtime.getURL('popup/popup.html')
        ];
        const isExtensionTab = extensionUrls.some(url => tab.url && tab.url.startsWith(url));

        // Если новая вкладка не служебная и превышен лимит пользовательских вкладок
        if (!isExtensionTab && userTabsCount > tabLimit && !isTabManagerOpen) {
            // Сохраняем ID новой вкладки для последующей подсветки
            const newTabId = tab.id;
            // Сохраняем URL новой вкладки (может быть pendingUrl для навигации)
            const newTabUrl = tab.pendingUrl || tab.url || 'about:blank';
            
            // Открываем менеджер вкладок с URL и ID новой вкладки
            openTabManager(newTabUrl, newTabId);
        } else {
            // Обычная проверка лимита
            checkTabLimit();
        }
    });
});

// Отслеживание обновлений вкладок для получения реального URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Если это новая вкладка, которая ожидает открытия менеджера, и у неё появился URL
    if (changeInfo.url && isTabManagerOpen) {
        chrome.storage.local.get(['newTabId'], (result) => {
            if (result.newTabId === tabId) {
                // Обновляем URL новой вкладки в storage
                chrome.storage.local.set({ 
                    newTabUrl: changeInfo.url,
                    newTabTitle: tab.title || 'Загружается...'
                });
                
                // Отправляем сообщение менеджеру вкладок для обновления отображения
                chrome.tabs.query({ url: chrome.runtime.getURL('tab-manager/tab-manager.html') }, (managerTabs) => {
                    if (managerTabs.length > 0) {
                        chrome.tabs.sendMessage(managerTabs[0].id, {
                            action: 'updateNewTabInfo',
                            url: changeInfo.url,
                            title: tab.title || 'Загружается...'
                        });
                    }
                });
            }
        });
    }

    // Обычная проверка лимита при других обновлениях
    if (!isTabManagerOpen) {
        checkTabLimit();
    }
});

// Отслеживание других событий вкладок
chrome.tabs.onRemoved.addListener(checkTabLimit); 