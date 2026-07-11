План: слияние Кошелька → PennyWallet (форк)
Этап 0 — Подготовка среды
- Форкнуть twrusstw/penny-wallet
- npm install, проверить сборку (npm run build)
- Настроить dev-sync в esbuild.config.mjs на твой .obsidian/plugins/penny-wallet/
- Убедиться, что плагин загружается и работает с текущими данными
Этап 1 — Русская локализация
- Добавить ru в i18n.ts — переводы всех UI-элементов
- Маппинг твоих названий категорий (Продукты, ЖКХ, Транспорт...) в dropdown-ы
- Результат: PennyWallet на русском, категории из Кошелька видны в интерфейсе
Этап 2 — Чтение категорий из файлов Кошелька
- В WalletFile добавить loadCategoriesFromFiles() — парсит Categories/*.md, читает bucket_type, base_limit, weight, cap, priority
- Объединить с категориями из penny-wallet.json (как custom)
- Категории отображаются в TransactionModal, фильтрах
- Результат: категории живут в файлах, а не в JSON
Этап 3 — Bucket-бюджет (base + overflow)
- Новый модуль budgetEngine.ts:
- Base buckets: жёсткие лимиты (Продукты=10K, ЖКХ=5K, Транспорт=3K)
- Overflow buckets: распределение остатка по весам + caps
- Расчёт plan vs fact из транзакций
- Новая вьюха BudgetView (или вкладка в Dashboard)
- Результат: движок бюджета Кошелька внутри PennyWallet
Этап 4 — Транзакции в формате Кошелька
- Поддержка чтения/записи индивидуальных .md-файлов транзакций (Transactions/YYYY-MM-DD--HH-MM--id.md)
- Парсинг YAML frontmatter (direction, amount, net_amount, category, account, cashback_*, id)
- Конвертация существующих PennyWallet-таблиц в новый формат (опциональный migrate)
- Результат: транзакции Кошелька отображаются и редактируются в PennyWallet
Этап 5 — Dashboard с бюджетом и трендами
- Переработать DashboardView:
- Metric cards: доход/расход/баланс + остаток по base buckets
- Прогресс по каждому base bucket (потрачено X / лимит Y)
- Overflow allocation: сколько ушло в каждую категорию
- Результат: полная картина «план — факт — остаток»
Этап 6 — Цели накоплений (Savings)
- Чтение Savings/*.md (target_amount, saved_amount, monthly_percent, deadline)
- Progress bar + forecast в Dashboard
- Вкладка SavingsView
- Результат: видно прогресс по целям
Этап 7 — Кешбек-программы
- Чтение Cashback/*.md (bank, per-category percents, limits)
- Расчёт cashback по транзакциям
- Dashboard: сколько заработано кешбека
- Результат: кешбек учитывается в аналитике
Этап 8 — Регулярные платежи
- Чтение Recurring/*.md
- CalendarView или секция в Dashboard с ближайшими платежами
- Auto-create транзакций при наступлении даты
- Результат: контроль подписок и регулярных списаний
Этап 9 — Telegram Bot Bridge (опционально)
- Добавить Webhook/API endpoint в PennyWallet
- Или адаптировать существующего бота для записи в PennyWallet-формат
- Результат: Telegram-бот работает через PennyWallet
Этапы можно проходить в любом порядке, они слабо связаны. Самое мясистое — Этапы 3 и 4 (бюджет и транзакции). С чего начинаем?