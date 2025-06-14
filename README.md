# Tab Limit Control v2.0.0

Интеллектуальное расширение для браузера, которое позволяет контролировать количество открытых вкладок с удобным менеджером.

### Интеллектуальный менеджер вкладок
- **Интерактивное управление**: При превышении лимита вместо автоматического закрытия открывается удобное модальное окно
- **Выбор вкладок для закрытия**: Пользователь сам решает, какие вкладки закрыть
- **Быстрые фильтры**: Выбор самых старых вкладок, дубликатов, группировка по доменам
- **Поиск и фильтрация**: Поиск вкладок по названию, URL или домену
- **Предварительный просмотр**: Отображение favicon, заголовка и URL каждой вкладки

### Настройки поведения
- **Режим менеджера**: Показывать интерактивное окно при превышении лимита
- **Автоматический режим**: Классическое автоматическое закрытие старых вкладок
- **Ручной вызов менеджера**: Кнопка для открытия менеджера в любое время

## Основные возможности

- 🎯 **Контроль лимита вкладок** - Установка пределов от 1 до 100 вкладок
- 📊 **Визуальные индикаторы** - Бейдж с количеством, мигание иконки при приближении к лимиту
- 🔧 **Гибкие настройки** - Выбор поведения при превышении лимита
- 🚀 **Быстрые действия** - Закрытие всех вкладок одним кликом
- 💾 **Сохранение настроек** - Все настройки сохраняются автоматически

## Как работает новый менеджер

1. **При превышении лимита** расширение перехватывает создание новой вкладки
2. **Открывается модальное окно** со списком всех открытых вкладок
3. **Пользователь выбирает** какие вкладки закрыть (с помощью чекбоксов)
4. **Быстрые фильтры** помогают выбрать вкладки автоматически:
   - *Самые старые* - выбирает вкладки в порядке открытия
   - *Дубликаты* - находит и выбирает повторяющиеся URL
   - *По доменам* - группирует вкладки одного сайта
5. **После выбора** закрываются ненужные вкладки, а новая открывается как планировалось

## Установка

### Из исходного кода (для разработки)

1. Скачайте или клонируйте репозиторий
2. Откройте Chrome и перейдите в `chrome://extensions/`
3. Включите "Режим разработчика" (Developer mode)
4. Нажмите "Загрузить распакованное" (Load unpacked)
5. Выберите папку с расширением

## Использование

### Базовые настройки
1. Нажмите на иконку расширения в панели инструментов
2. Установите желаемый лимит вкладок (1-100)
3. Выберите режим поведения:
   - **Менеджер вкладок** - интерактивный выбор (рекомендуется)
   - **Автоматическое закрытие** - классический режим
4. Нажмите "Сохранить настройки"

### Работа с менеджером вкладок
1. При превышении лимита автоматически откроется менеджер
2. Или вызовите его вручную кнопкой "Открыть менеджер вкладок"
3. Выберите вкладки для закрытия:
   - Используйте чекбоксы для ручного выбора
   - Или воспользуйтесь быстрыми фильтрами
4. Нажмите "Закрыть выбранные" или "Отмена"
5. Для управления можно пользоваться стрелками на клавиатуре, пробел для выбора, Enter для закрытия.

### Быстрые действия
- **Поиск**: Введите текст для поиска по названию, URL или домену
- **Выбрать все**: Чекбокс для выбора всех видимых вкладок
- **Быстрые фильтры**: Кнопки для автоматического выбора определенных типов вкладок

## Технические детали

### Архитектура
- **Manifest V3** - Современный API расширений Chrome
- **Service Worker** - Фоновая обработка событий
- **Модульная структура** - Разделение на компоненты

### Файловая структура
```
tabs_extension/
├── background/
│   └── background.js          # Основная логика расширения
├── popup/
│   ├── popup.html            # Интерфейс настроек
│   ├── popup.css             # Стили настроек
│   └── popup.js              # Логика настроек
├── tab-manager/
│   ├── tab-manager.html      # Интерфейс менеджера вкладок
│   ├── tab-manager.css       # Стили менеджера
│   └── tab-manager.js        # Логика менеджера
├── icons/                    # Иконки расширения
└── manifest.json             # Конфигурация расширения
```

## Разработка

### Тестирование
1. Установите расширение в режиме разработчика
2. Откройте больше вкладок, чем установленный лимит
3. Проверьте работу менеджера вкладок
4. Протестируйте различные режимы поведения

### Отладка
- Используйте Developer Tools для отладки popup и tab-manager
- Логи background script доступны в `chrome://extensions/` → "Просмотр" у расширения

## Автор

**Max Zarev**
- GitHub: [MaxZarev](https://github.com/MaxZarev)
- Telegram: [@maxzarev](https://t.me/maxzarev)

## Версии

- **v2.0.0** - Добавлен интеллектуальный менеджер вкладок
- **v1.0.0** - Базовая функциональность контроля лимита