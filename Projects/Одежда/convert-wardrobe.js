// Конвертер таблицы одежды в отдельные .md файлы с YAML frontmatter
// Запускать из консоли: node convert-wardrobe.js

const fs = require('fs');
const path = require('path');

// Путь к файлу базы одежды
const wardrobeFile = path.join(__dirname, '../../Projects/Одежда/Одежда база данных.md');
const itemsDir = path.join(__dirname, '../../Projects/Одежда/items');

// Маппинг категорий к папкам
const categoryMap = {
    'Футболки': 'футболки',
    'Кофты и толстовки': 'кофты',
    'Штаны и брюки': 'штаны',
    'Аксессуары': 'аксессуары',
    'Рюкзаки и сумки': 'рюкзаки_сумки',
    'Нижнее белье': 'нижнее_белье',
    'Носки': 'носки',
    'Костюмы': 'костюмы',
    'Верхняя одежда': 'верхняя_одежда',
    'Обувь': 'обувь',
};

// Определение группы цвета для корзины
function getColorGroup(color) {
    if (!color) return 'colored';
    const c = color.toLowerCase();
    if (c.includes('черн') || c.includes('темно-син') || c.includes('бордов') || c.includes('фиолет')) {
        return 'black';
    }
    if (c.includes('бел') || c.includes('светл') || c.includes('бежев')) {
        return 'white';
    }
    return 'colored';
}

// Парсинг веса в граммы
function parseWeight(weightStr) {
    if (!weightStr) return 0;
    const match = weightStr.match(/([\d.,]+)\s*г/);
    if (match) {
        return parseFloat(match[1].replace(',', '.'));
    }
    const kgMatch = weightStr.match(/([\d.,]+)\s*кг/);
    if (kgMatch) {
        return parseFloat(kgMatch[1].replace(',', '.')) * 1000;
    }
    return 0;
}

// Парсинг лимита носки
function parseWashLimit(washStr) {
    if (!washStr) return 999;
    if (washStr.includes('не стирается') || washStr.includes('чистка')) return 999;
    if (washStr.includes('1 раз')) return 1;
    
    const match = washStr.match(/(\d+)/);
    if (match) return parseInt(match[1]);
    return 3; // default
}

// Создание slug из имени
function slugify(name, color) {
    let slug = name
        .toLowerCase()
        .replace(/[^\w\sа-яё-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 40);
    
    // Добавляем цвет если есть (для различия одинаковых вещей)
    if (color && color !== 'не указан') {
        const colorSlug = color
            .toLowerCase()
            .replace(/[^\w\sа-яё-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 15);
        slug = `${slug}-${colorSlug}`;
    }
    
    return slug.substring(0, 50);
}

// Парсинг Markdown таблицы
function parseTable(content) {
    const lines = content.split('\n');
    const items = [];
    let currentCategory = '';
    
    for (const line of lines) {
        // Пропускаем пустые строки и заголовки
        if (!line.trim() || line.startsWith('#') || line.startsWith('| ---')) continue;
        
        // Проверяем, это категория (жирный текст в первой колонке без других данных)
        const categoryMatch = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*$/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1];
            continue;
        }
        
        // Парсим строку таблицы
        const cells = line.split('|').map(c => c.trim()).filter((c, i) => i > 0 && i < line.split('|').length - 1);
        if (cells.length < 6) continue;
        
        const [name, qty, color, size, weight, washLimit] = cells;
        
        // Пропускаем строки категорий внутри таблицы
        if (name.startsWith('**') && name.endsWith('**')) {
            currentCategory = name.replace(/\*\*/g, '');
            continue;
        }
        
        if (!name || name === 'Название') continue;
        
        const folder = categoryMap[currentCategory] || 'аксессуары';
        const qtyNum = parseInt(qty) || 1;
        
        // Создаём файл для каждой единицы одежды
        for (let i = 0; i < qtyNum; i++) {
            items.push({
                category: currentCategory,
                folder,
                name: name.replace(/\*\*/g, '').trim(),
                color: color || 'не указан',
                colorGroup: getColorGroup(color),
                size: size || '—',
                weight: parseWeight(weight),
                weightStr: weight || '0 г',
                washAfterWears: parseWashLimit(washLimit),
                wearsCount: 0,
                isDirty: false,
                laundryBasket: null,
                suffix: qtyNum > 1 ? `-${i + 1}` : ''
            });
        }
    }
    
    return items;
}

// Генерация YAML frontmatter
function generateYAML(item) {
    return `---
type: "${item.category}"
name: "${item.name}"
color: "${item.color}"
color_group: ${item.colorGroup}
size: "${item.size}"
weight: ${item.weight}
weight_str: "${item.weightStr}"
wash_after_wears: ${item.washAfterWears}
wears_count: 0
is_dirty: false
laundry_basket: null
---

# ${item.name}

- **Цвет:** ${item.color}
- **Размер:** ${item.size}
- **Вес:** ${item.weightStr}
- **Носить до стирки:** ${item.washAfterWears} раз
- **Надето раз:** 0
`;
}

// Основная функция
function convert() {
    console.log('📖 Читаем файл базы одежды...');
    const content = fs.readFileSync(wardrobeFile, 'utf-8');
    
    console.log('🔍 Парсим таблицу...');
    const items = parseTable(content);
    console.log(`   Найдено ${items.length} единиц одежды`);
    
    console.log('📁 Создаём файлы...');
    let created = 0;
    
    for (const item of items) {
        const folderPath = path.join(itemsDir, item.folder);
        const fileName = `${slugify(item.name, item.color)}${item.suffix}.md`;
        const filePath = path.join(folderPath, fileName);
        
        const yaml = generateYAML(item);
        fs.writeFileSync(filePath, yaml, 'utf-8');
        created++;
        console.log(`   ✓ ${item.folder}/${fileName}`);
    }
    
    console.log(`\n✅ Готово! Создано ${created} файлов в ${itemsDir}`);
    console.log('📝 Оригинальный файл не был изменён.');
}

convert();
