<%*
const api = await tp.user.food_receipt_api(tp);
const qr = await tp.system.prompt("Вставь QR-код чека (строка из приложения Честный ЗНАК)");
if (!qr) {
    tR = "# Отменено";
    return;
}

new Notice("Авторизация...");
const authed = await api.ensureAuth();
if (!authed) {
    tR = "# Авторизация не пройдена";
    return;
}

new Notice("Получаю чек из ФНС...");
try {
    const ticket = await api.getTicket(qr.trim());
    tR = "```json\n" + JSON.stringify(ticket, null, 2) + "\n```";
} catch (e) {
    tR = "# Ошибка получения чека\n\n" + (e.message || String(e));
}
%>
