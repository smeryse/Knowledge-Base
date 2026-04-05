<%*
// Отмена трекинга: уменьшает счётчики вещей на 1
const ITEMS_DIR = 'Projects/Одежда/items';

const file = app.workspace.getActiveFile();
if (!file) {
    new Notice("❌ Открой daily note!");
    return;
}

const content = await app.vault.read(file);
const outfitMatch = content.match(/<!-- outfit-data: (.+?) -->/);

if (!outfitMatch) {
    new Notice("❌ Нет данных об образе!");
    return;
}

const outfit = JSON.parse(outfitMatch[1]);
const allFiles = app.vault.getMarkdownFiles().filter(f => f.path.startsWith(ITEMS_DIR));
const reverted = [];

async function readYAML(f) {
    const c = await app.vault.read(f);
    const m = c.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return null;
    const y = {};
    for (const line of m[1].split('\n')) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
            let v = match[2].trim();
            if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
            if (v === 'true') v = true;
            else if (v === 'false') v = false;
            else if (v === 'null') v = null;
            else if (!isNaN(v) && v !== '') v = Number(v);
            y[match[1]] = v;
        }
    }
    return { yaml: y, content: c, file: f };
}

async function findItem(name) {
    const keywords = name.toLowerCase().replace(/[()]/g, '').split(' ').filter(w => w.length > 3);
    let best = null, bestScore = 0;
    for (const f of allFiles) {
        const data = await readYAML(f);
        if (!data) continue;
        const n = (data.yaml.name || '').toLowerCase();
        let score = 0;
        for (const kw of keywords) if (n.includes(kw)) score++;
        if (score > bestScore) { bestScore = score; best = f; }
    }
    return best;
}

for (const field of ['top', 'bottom', 'shoes', 'socks', 'outerwear', 'accessories']) {
    const val = outfit[field];
    if (!val || val === '—') continue;
    
    for (const part of val.split('/')) {
        const nm = part.trim().match(/^([^(]+?)(?:\s*\(.+?\))?\s*$/);
        const itemName = nm ? nm[1].trim() : part.trim();
        if (!itemName) continue;
        
        const itemFile = await findItem(itemName);
        if (!itemFile) continue;
        
        const data = await readYAML(itemFile);
        if (!data) continue;
        if (data.yaml.wash_after_wears >= 999) continue;
        
        // Уменьшаем счётчик (минимум 0)
        data.yaml.wears_count = Math.max(0, (data.yaml.wears_count || 0) - 1);
        
        // Если счётчик стал ниже лимита — снимаем грязь
        if (data.yaml.wears_count < data.yaml.wash_after_wears) {
            data.yaml.is_dirty = false;
            data.yaml.laundry_basket = null;
        }
        
        let newYAML = '---\n';
        for (const [k, v] of Object.entries(data.yaml)) {
            newYAML += typeof v === 'string' ? `${k}: "${v}"\n` : `${k}: ${v}\n`;
        }
        newYAML += '---\n';
        
        await app.vault.modify(itemFile, data.content.replace(/^---\n[\s\S]*?\n---/, newYAML));
        reverted.push(`${data.yaml.name}: ${data.yaml.wears_count}x`);
    }
}

if (reverted.length > 0) {
    new Notice(`↩️ Отменено: ${reverted.length} вещей`);
    
    // Возвращаем чекбокс в [ ]
    const newContent = content.replace(/- \[x\] Образ надет/, '- [ ] Образ надет');
    await app.vault.modify(file, newContent);
} else {
    new Notice('⚠️ Не удалось отменить');
}
%>
