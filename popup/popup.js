document.addEventListener('DOMContentLoaded', () => {
    const tabLimitInput = document.getElementById('tabLimit');
    const currentTabCount = document.getElementById('currentTabCount');
    const saveButton = document.getElementById('saveSettings');
    const closeOtherTabsButton = document.getElementById('closeOtherTabs');

    // Загрузка сохраненных настроек
    chrome.storage.local.get(['tabLimit'], (result) => {
        if (result.tabLimit && typeof result.tabLimit === 'number') {
            tabLimitInput.value = Math.min(Math.max(result.tabLimit, 1), 100);
        }
    });

    // Обновление количества вкладок
    chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
            console.error('Ошибка при получении вкладок:', chrome.runtime.lastError);
            return;
        }
        currentTabCount.textContent = tabs.length;
    });

    // Сохранение настроек
    saveButton.addEventListener('click', () => {
        const limit = parseInt(tabLimitInput.value);
        if (!isNaN(limit) && limit >= 1 && limit <= 100) {
            chrome.storage.local.set({ tabLimit: limit }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Ошибка при сохранении настроек:', chrome.runtime.lastError);
                    return;
                }
                chrome.runtime.sendMessage({ action: 'updateTabLimit', limit });
            });
        }
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
            });
        });
    });
}); 