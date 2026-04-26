module.exports = async function foodReceiptOcr(tp) {
    const childProcess = require("child_process");
    const path = require("path");

    function runTesseract(imagePath) {
        try {
            return childProcess.execFileSync("tesseract", [imagePath, "stdout", "-l", "rus+eng"], {
                encoding: "utf8",
                maxBuffer: 10 * 1024 * 1024
            });
        } catch (error) {
            return childProcess.execFileSync("tesseract", [imagePath, "stdout", "-l", "eng"], {
                encoding: "utf8",
                maxBuffer: 10 * 1024 * 1024
            });
        }
    }

    function normalizeLines(text) {
        return text
            .split(/\r?\n/)
            .map(line => line.replace(/\s+/g, " ").trim())
            .filter(Boolean);
    }

    function detectDate(lines) {
        for (const line of lines) {
            const match = line.match(/(\d{2}[\.\-/]\d{2}[\.\-/]\d{2,4})/);
            if (match) return match[1];
        }
        return "";
    }

    function detectTotals(lines) {
        const candidates = [];
        for (const line of lines) {
            if (/итог|сумма|к оплате|всего/i.test(line)) {
                candidates.push(line);
            }
        }
        return candidates;
    }

    const rawPath = (await tp.system.prompt("Путь к фото чека", "assets/"))?.trim();
    if (!rawPath) {
        return "# OCR отменён\n";
    }

    const absolutePath = path.isAbsolute(rawPath)
        ? rawPath
        : path.join(app.vault.adapter.basePath, rawPath);

    let text = "";
    try {
        text = runTesseract(absolutePath);
    } catch (error) {
        return `# OCR ошибка\n\nНе удалось прогнать чек через tesseract.\n\n\`\`\`text\n${String(error.message || error)}\n\`\`\``;
    }

    const lines = normalizeLines(text);
    const dateGuess = detectDate(lines);
    const totals = detectTotals(lines);

    return [
        "# OCR чек",
        "",
        `- Файл: \`${rawPath}\``,
        dateGuess ? `- Похоже на дату: ${dateGuess}` : "- Дата не распознана",
        "",
        "## Кандидаты на итог",
        "",
        ...(totals.length ? totals.map(line => `- ${line}`) : ["- Не найдены"]),
        "",
        "## OCR текст",
        "",
        "```text",
        ...lines,
        "```",
        "",
        "## Что дальше",
        "",
        "1. Проверь магазин, дату и итог.",
        "2. Перенеси позиции в обычный мастер чека.",
        "3. Для повторяющихся товаров лучше использовать штрихкодный сценарий."
    ].join("\n");
};
