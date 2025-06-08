// Глобальные переменные
let allTabs = [];
let tabLimit = 20;
let selectedTabs = new Set();
let pendingUrl = null; // URL новой вкладки, которую нужно открыть
let newTabId = null; // ID новой вкладки для подсветки
let newTabUrl = null; // URL новой вкладки
let newTabTitle = null; // Заголовок новой вкладки
let focusedIndex = 0; // Индекс текущей сфокусированной вкладки
let visibleTabs = []; // Массив видимых вкладок (после фильтрации)
let currentFocusArea = 'tabs'; // 'tabs' или 'buttons'
let focusedButtonIndex = 0; // Индекс сфокусированной кнопки

// DOM элементы
const elements = {
    currentCount: document.getElementById('currentCount'),
    tabLimit: document.getElementById('tabLimit'),
    needToClose: document.getElementById('needToClose'),
    selectedCount: document.getElementById('selectedCount'),
    tabsList: document.getElementById('tabsList'),
    searchInput: document.getElementById('searchInput'),
    selectAll: document.getElementById('selectAll'),
    closeSelected: document.getElementById('closeSelected'),
    cancel: document.getElementById('cancel'),
    closeTab: document.getElementById('closeTab'),
    selectOldest: document.getElementById('selectOldest'),
    selectDuplicates: document.getElementById('selectDuplicates'),
    selectByDomain: document.getElementById('selectByDomain'),
    clearSelection: document.getElementById('clearSelection')
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    setupEventListeners();
    setupKeyboardNavigation();
    renderTabs();
    updateStats();
    
    // Устанавливаем фокус на список вкладок для навигации клавишами
    elements.tabsList.focus();
});

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

// Загрузка начальных данных
async function loadInitialData() {
    try {
        // Получаем настройки из storage
        const result = await chrome.storage.local.get(['tabLimit', 'pendingUrl', 'newTabId', 'newTabUrl', 'newTabTitle']);
        tabLimit = result.tabLimit || 20;
        pendingUrl = result.pendingUrl || null;
        newTabId = result.newTabId || null;
        newTabUrl = result.newTabUrl || null;
        newTabTitle = result.newTabTitle || null;
        
        // Получаем все вкладки
        const allRawTabs = await chrome.tabs.query({});
        
        // Фильтруем служебные вкладки расширения
        const userTabs = filterExtensionTabs(allRawTabs);
        
        // Добавляем дополнительную информацию к вкладкам
        allTabs = userTabs.map((tab, index) => ({
            ...tab,
            domain: extractDomain(tab.url),
            timeAgo: 'недавно', // В будущем можно добавить реальное время
            originalIndex: index, // Сохраняем оригинальный порядок
            isNew: tab.id === newTabId, // Помечаем новую вкладку
            // Для новой вкладки используем сохраненные данные, если они есть
            title: tab.id === newTabId && newTabTitle ? newTabTitle : tab.title,
            url: tab.id === newTabId && newTabUrl ? newTabUrl : tab.url
        }));
        
        // Сортируем вкладки: новая вкладка должна быть последней
        allTabs.sort((a, b) => {
            if (a.isNew && !b.isNew) return 1; // новая вкладка в конец
            if (!a.isNew && b.isNew) return -1; // новая вкладка в конец
            return a.originalIndex - b.originalIndex; // остальные по оригинальному порядку
        });
        
        visibleTabs = [...allTabs]; // Изначально все вкладки видимы
        
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
    }
}

// Извлечение домена из URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return 'неизвестный домен';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск вкладок
    elements.searchInput.addEventListener('input', (e) => {
        filterTabs(e.target.value);
        resetFocus();
    });

    // Выбрать все
    elements.selectAll.addEventListener('change', (e) => {
        toggleSelectAll(e.target.checked);
    });

    // Кнопки действий
    elements.closeSelected.addEventListener('click', closeSelectedTabs);
    elements.cancel.addEventListener('click', cancelAction);
    elements.closeTab.addEventListener('click', cancelAction);

    // Быстрые действия
    elements.selectOldest.addEventListener('click', () => {
        selectOldestTabs();
        resetFocus();
    });
    elements.selectDuplicates.addEventListener('click', () => {
        selectDuplicateTabs();
        resetFocus();
    });
    elements.selectByDomain.addEventListener('click', () => {
        selectByDomain();
        resetFocus();
    });
    elements.clearSelection.addEventListener('click', () => {
        clearAllSelection();
        resetFocus();
    });
}

// Настройка навигации клавишами
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Если фокус в поле поиска, не обрабатываем навигационные клавиши
        if (document.activeElement === elements.searchInput) {
            if (e.key === 'Escape') {
                elements.searchInput.blur();
                setFocusArea('tabs');
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentFocusArea === 'tabs') {
                    moveFocus(-1);
                } else if (currentFocusArea === 'buttons') {
                    moveButtonFocus(-1);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (currentFocusArea === 'tabs') {
                    moveFocus(1);
                } else if (currentFocusArea === 'buttons') {
                    moveButtonFocus(1);
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (currentFocusArea === 'tabs') {
                    setFocusArea('buttons');
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (currentFocusArea === 'buttons') {
                    setFocusArea('tabs');
                }
                break;
            case ' ':
            case 'Spacebar':
                e.preventDefault();
                if (currentFocusArea === 'tabs') {
                    toggleCurrentTabSelection();
                } else if (currentFocusArea === 'buttons') {
                    clickFocusedButton();
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (currentFocusArea === 'buttons' || !elements.closeSelected.disabled) {
                    closeSelectedTabs();
                }
                break;
            case 'Escape':
                e.preventDefault();
                cancelAction();
                break;
            case '/':
                e.preventDefault();
                elements.searchInput.focus();
                break;
            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    elements.selectAll.checked = !elements.selectAll.checked;
                    toggleSelectAll(elements.selectAll.checked);
                }
                break;
        }
    });

    // Обработка клика по списку для восстановления фокуса
    elements.tabsList.addEventListener('click', (e) => {
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            const index = Array.from(elements.tabsList.children).indexOf(tabItem);
            focusedIndex = index;
            setFocusArea('tabs');
        }
    });
}

// Переключение области фокуса
function setFocusArea(area) {
    currentFocusArea = area;
    
    if (area === 'tabs') {
        elements.tabsList.focus();
        updateFocusVisuals();
        updateButtonFocus();
    } else if (area === 'buttons') {
        updateFocusVisuals();
        updateButtonFocus();
        focusCurrentButton();
    }
}

// Фокус на текущей кнопке
function focusCurrentButton() {
    const buttons = [elements.closeSelected, elements.cancel];
    if (buttons[focusedButtonIndex]) {
        buttons[focusedButtonIndex].focus();
    }
}

// Перемещение фокуса кнопок
function moveButtonFocus(direction) {
    const buttons = [elements.closeSelected, elements.cancel];
    const newIndex = focusedButtonIndex + direction;
    
    if (newIndex >= 0 && newIndex < buttons.length) {
        focusedButtonIndex = newIndex;
        focusCurrentButton();
    }
}

// Клик по сфокусированной кнопке
function clickFocusedButton() {
    const buttons = [elements.closeSelected, elements.cancel];
    const button = buttons[focusedButtonIndex];
    if (button && !button.disabled) {
        button.click();
    }
}

// Обновление визуального фокуса кнопок
function updateButtonFocus() {
    const buttons = [elements.closeSelected, elements.cancel];
    buttons.forEach((button, index) => {
        if (currentFocusArea === 'buttons' && index === focusedButtonIndex) {
            button.style.boxShadow = '0 0 0 2px #4CAF50';
        } else {
            button.style.boxShadow = '';
        }
    });
}

// Перемещение фокуса
function moveFocus(direction) {
    const newIndex = focusedIndex + direction;
    
    if (newIndex >= 0 && newIndex < visibleTabs.length) {
        focusedIndex = newIndex;
        updateFocusVisuals();
        scrollToFocusedTab();
    }
}

// Обновление визуального отображения фокуса
function updateFocusVisuals() {
    const tabItems = elements.tabsList.querySelectorAll('.tab-item');
    
    tabItems.forEach((item, index) => {
        if (currentFocusArea === 'tabs' && index === focusedIndex) {
            item.classList.add('focused');
        } else {
            item.classList.remove('focused');
        }
    });
}

// Прокрутка к сфокусированной вкладке
function scrollToFocusedTab() {
    const focusedTab = elements.tabsList.children[focusedIndex];
    if (focusedTab) {
        focusedTab.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

// Переключение выбора текущей сфокусированной вкладки
function toggleCurrentTabSelection() {
    if (focusedIndex >= 0 && focusedIndex < visibleTabs.length) {
        const tab = visibleTabs[focusedIndex];
        const isSelected = selectedTabs.has(tab.id);
        toggleTabSelection(tab.id, !isSelected);
        
        // Обновляем чекбокс в UI
        const tabItem = elements.tabsList.children[focusedIndex];
        const checkbox = tabItem?.querySelector('.tab-checkbox');
        if (checkbox) {
            checkbox.checked = !isSelected;
        }
    }
}

// Сброс фокуса в начало списка
function resetFocus() {
    focusedIndex = 0;
    focusedButtonIndex = 0;
    setFocusArea('tabs');
}

// Отрисовка списка вкладок
function renderTabs(tabsToRender = allTabs) {
    visibleTabs = tabsToRender;
    elements.tabsList.innerHTML = '';
    
    if (visibleTabs.length === 0) {
        elements.tabsList.innerHTML = '<div style="padding: 15px; text-align: center; color: #666; font-size: 12px;">Вкладки не найдены</div>';
        return;
    }

    visibleTabs.forEach((tab, index) => {
        const tabElement = createTabElement(tab, index);
        elements.tabsList.appendChild(tabElement);
    });
    
    // Сбрасываем фокус и обновляем визуалы
    resetFocus();
}

// Создание элемента вкладки
function createTabElement(tab, index) {
    const tabDiv = document.createElement('div');
    tabDiv.className = `tab-item ${selectedTabs.has(tab.id) ? 'selected' : ''} ${tab.isNew ? 'new-tab' : ''}`;
    tabDiv.dataset.tabId = tab.id;

    // Получаем favicon или используем стандартную иконку
    const defaultIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZGRkIiByeD0iMiIvPjx0ZXh0IHg9IjgiIHk9IjExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjgiIGZpbGw9IiM2NjYiPvCfk4Q8L3RleHQ+PC9zdmc+';
    const favicon = tab.favIconUrl || defaultIcon;

    tabDiv.innerHTML = `
        <input type="checkbox" class="tab-checkbox" ${selectedTabs.has(tab.id) ? 'checked' : ''}>
        <img src="${favicon}" class="tab-favicon" alt="favicon">
        <div class="tab-info">
            <div class="tab-title">${escapeHtml(tab.title || 'Без названия')}${tab.isNew ? ' <span class="new-label">НОВАЯ</span>' : ''}</div>
            <div class="tab-url">${escapeHtml(tab.url)}</div>
        </div>
        <div class="tab-meta">
            <div class="tab-domain">${escapeHtml(tab.domain)}</div>
            <div class="tab-time">${tab.timeAgo}</div>
        </div>
    `;

    // Добавляем обработчик ошибки загрузки иконки через JavaScript
    const imgElement = tabDiv.querySelector('.tab-favicon');
    imgElement.addEventListener('error', function() {
        this.src = defaultIcon;
    });

    // Обработчик клика по вкладке
    tabDiv.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
            const checkbox = tabDiv.querySelector('.tab-checkbox');
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        }
        
        // Устанавливаем фокус на эту вкладку
        focusedIndex = index;
        setFocusArea('tabs');
    });

    // Обработчик изменения чекбокса
    const checkbox = tabDiv.querySelector('.tab-checkbox');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleTabSelection(tab.id, e.target.checked);
    });

    return tabDiv;
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Переключение выбора вкладки
function toggleTabSelection(tabId, isSelected) {
    if (isSelected) {
        selectedTabs.add(tabId);
    } else {
        selectedTabs.delete(tabId);
    }
    
    updateTabVisualState(tabId, isSelected);
    updateStats();
    updateSelectAllState();
}

// Обновление визуального состояния вкладки
function updateTabVisualState(tabId, isSelected) {
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        // Обновляем CSS-класс
        tabElement.classList.toggle('selected', isSelected);
        
        // Обновляем состояние чекбокса
        const checkbox = tabElement.querySelector('.tab-checkbox');
        if (checkbox) {
            checkbox.checked = isSelected;
        }
    }
}

// Обновление статистики
function updateStats() {
    const currentCount = allTabs.length;
    const selectedCount = selectedTabs.size;
    const needToClose = Math.max(0, currentCount - tabLimit); // Убираем +1, так как новая вкладка уже открыта

    elements.currentCount.textContent = currentCount;
    elements.tabLimit.textContent = tabLimit;
    elements.needToClose.textContent = needToClose;
    elements.selectedCount.textContent = selectedCount;

    // Активация/деактивация кнопки закрытия
    const canClose = selectedCount >= needToClose;
    elements.closeSelected.disabled = !canClose;
    
    // Обновляем текст кнопки
    const btnText = elements.closeSelected.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = canClose 
            ? `Закрыть (${selectedCount})` 
            : `Выберите еще ${needToClose - selectedCount}`;
    } else {
        elements.closeSelected.textContent = canClose 
            ? `Закрыть (${selectedCount})` 
            : `Выберите еще ${needToClose - selectedCount}`;
    }
}

// Обновление состояния "выбрать все"
function updateSelectAllState() {
    const allVisible = visibleTabs.every(tab => selectedTabs.has(tab.id));
    const someVisible = visibleTabs.some(tab => selectedTabs.has(tab.id));
    
    elements.selectAll.checked = allVisible;
    elements.selectAll.indeterminate = someVisible && !allVisible;
}

// Получение видимых вкладок (после фильтрации)
function getVisibleTabs() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    if (!searchTerm) return allTabs;
    
    return allTabs.filter(tab => 
        tab.title.toLowerCase().includes(searchTerm) ||
        tab.url.toLowerCase().includes(searchTerm) ||
        tab.domain.toLowerCase().includes(searchTerm)
    );
}

// Фильтрация вкладок
function filterTabs(searchTerm) {
    const filteredTabs = getVisibleTabs();
    renderTabs(filteredTabs);
    updateSelectAllState();
}

// Выбрать/снять все
function toggleSelectAll(selectAll) {
    visibleTabs.forEach(tab => {
        if (selectAll) {
            selectedTabs.add(tab.id);
        } else {
            selectedTabs.delete(tab.id);
        }
        updateTabVisualState(tab.id, selectAll);
    });
    
    updateStats();
}

// Выбрать самые старые вкладки
function selectOldestTabs() {
    clearAllSelection();
    const needToClose = Math.max(0, allTabs.length - tabLimit);
    
    // Простая логика: выбираем первые N вкладок (самые "старые" по порядку)
    // Но исключаем новую вкладку из автоматического выбора
    const tabsToSelect = allTabs.filter(tab => !tab.isNew).slice(0, needToClose);
    tabsToSelect.forEach(tab => {
        selectedTabs.add(tab.id);
        updateTabVisualState(tab.id, true);
    });
    
    updateStats();
    updateSelectAllState();
}

// Выбрать дубликаты
function selectDuplicateTabs() {
    const urlGroups = {};
    
    // Группируем вкладки по URL
    allTabs.forEach(tab => {
        const url = tab.url;
        if (!urlGroups[url]) {
            urlGroups[url] = [];
        }
        urlGroups[url].push(tab);
    });
    
    // Выбираем дубликаты (оставляем первую вкладку в каждой группе)
    Object.values(urlGroups).forEach(group => {
        if (group.length > 1) {
            // Выбираем все кроме первой
            group.slice(1).forEach(tab => {
                selectedTabs.add(tab.id);
                updateTabVisualState(tab.id, true);
            });
        }
    });
    
    updateStats();
    updateSelectAllState();
}

// Группировка по доменам (показать группы)
function selectByDomain() {
    // Простая реализация: выбираем вкладки с наиболее часто встречающимися доменами
    const domainCounts = {};
    
    allTabs.forEach(tab => {
        domainCounts[tab.domain] = (domainCounts[tab.domain] || 0) + 1;
    });
    
    // Находим домены с количеством > 1
    const duplicateDomains = Object.entries(domainCounts)
        .filter(([domain, count]) => count > 1)
        .sort((a, b) => b[1] - a[1]); // сортируем по убыванию количества
    
    if (duplicateDomains.length > 0) {
        const topDomain = duplicateDomains[0][0];
        
        // Выбираем все вкладки этого домена кроме одной
        const domainTabs = allTabs.filter(tab => tab.domain === topDomain);
        domainTabs.slice(1).forEach(tab => {
            selectedTabs.add(tab.id);
            updateTabVisualState(tab.id, true);
        });
    }
    
    updateStats();
    updateSelectAllState();
}

// Очистка всех выборов
function clearAllSelection() {
    selectedTabs.clear();
    
    document.querySelectorAll('.tab-item').forEach(tabElement => {
        const checkbox = tabElement.querySelector('.tab-checkbox');
        checkbox.checked = false;
        tabElement.classList.remove('selected');
    });
    
    updateStats();
    updateSelectAllState();
}

// Закрытие выбранных вкладок
async function closeSelectedTabs() {
    if (selectedTabs.size === 0) return;
    
    try {
        // Закрываем выбранные вкладки
        const tabIds = Array.from(selectedTabs);
        await chrome.tabs.remove(tabIds);
        
        // Очищаем ID новой вкладки из storage
        await chrome.storage.local.remove(['newTabId', 'newTabUrl', 'newTabTitle']);
        
        // Закрываем модальное окно
        window.close();
        
    } catch (error) {
        console.error('Ошибка при закрытии вкладок:', error);
        alert('Произошла ошибка при закрытии вкладок');
    }
}

// Отмена действия
function cancelAction() {
    // Сообщаем background script об отмене
    chrome.runtime.sendMessage({
        action: 'cancelNewTab',
        pendingUrl: pendingUrl
    });
    
    window.close();
}

// Обработка сообщений от background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateTabData') {
        loadInitialData().then(() => {
            renderTabs();
            updateStats();
        });
    }
    
    // Обновление информации о новой вкладке в реальном времени
    if (message.action === 'updateNewTabInfo') {
        // Обновляем глобальные переменные
        newTabUrl = message.url;
        newTabTitle = message.title;
        
        // Обновляем информацию о новой вкладке в массиве
        const newTabIndex = allTabs.findIndex(tab => tab.id === newTabId);
        if (newTabIndex !== -1) {
            allTabs[newTabIndex] = {
                ...allTabs[newTabIndex],
                title: message.title,
                url: message.url,
                domain: extractDomain(message.url)
            };
            
            // Перерендериваем вкладки
            renderTabs();
        }
    }
    
    sendResponse({ success: true });
    return true;
}); 