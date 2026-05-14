<%*
const api = await tp.user.food_receipt_api(tp);
const qr = await tp.system.prompt("Вставь QR-код чека (строка из приложения Честный ЗНАК)");
if (!qr) return "# Отменено";

const authed = await api.ensureAuth();
if (!authed) return "# Авторизация не пройдена";

try {
    const ticket = await api.getTicket(qr.trim());
    return "```json\n" + JSON.stringify(ticket, null, 2) + "\n```";
} catch (e) {
    return "# Ошибка получения чека\n\n" + e.message;
}
%>
