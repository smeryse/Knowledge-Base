<%*
const api = await tp.user.food_receipt_api(tp);
const importer = await tp.user.food_import_api(tp);

const qr = await tp.system.prompt("Вставь QR-строку чека (t=...&s=...&fn=...)");
if (!qr) {
    tR = "# Отменено";
    return;
}

new Notice("Получаю чек из API ПроверкаЧека...");
let raw;
try {
    raw = await api.fetchProverkaCheka(qr.trim());
} catch (e) {
    tR = "# Ошибка получения чека\n\n" + (e.message || String(e));
    return;
}

const ticket = api.parseProverkaResponse(raw);
if (!ticket) {
    tR = "# Не удалось распознать чек\n\nОтвет API:\n```json\n" + JSON.stringify(raw, null, 2) + "\n```";
    return;
}

new Notice(`Чек распознан: ${ticket.items.length} поз., магазин: ${ticket.retailPlace || "?"}`);

try {
    const result = await importer.importReceiptFromProverka(tp, ticket);
    tR = result;
} catch (e) {
    tR = "# Ошибка импорта чека\n\n" + (e.message || String(e));
}
%>
