module.exports = async function foodReceiptApiTest(tp) {
    const token = "39472.ko9FFxXlLqgXlUZXk";
    const url = "https://proverkacheka.com/api/v1/check/get";

    const qr = await tp.system.prompt("Вставь QR-строку чека (t=...&s=...&fn=...)");
    if (!qr) {
        tR = "# Отменено";
        return;
    }

    new Notice("Отправляю запрос...");

    const body = `qrraw=${encodeURIComponent(qr.trim())}&token=${encodeURIComponent(token)}`;
    const resp = await requestUrl({
        url: url,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        },
        body: body,
        throw: false
    });

    const output = [
        "# Сырой ответ API ПроверкаЧека",
        "",
        "```",
        `HTTP ${resp.status}`,
        "",
        resp.text,
        "```"
    ].join("\n");

    new Notice(`Ответ: HTTP ${resp.status}`);
    tR = output;
};
