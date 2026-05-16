module.exports = async function foodLlmCheck(tp) {
    const CONFIG_PATH = "Projects/Кухня/System/resolver-config.json";

    function cleanBarcode(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function looksLikeBarcode(value) {
        return cleanBarcode(value).length >= 8;
    }

    function buildBarcodeVariants(barcode) {
        const clean = cleanBarcode(barcode);
        const variants = [];
        const seen = new Set();

        function pushVariant(value, reason) {
            const normalized = cleanBarcode(value);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            variants.push({ code: normalized, reason });
        }

        pushVariant(clean, "original");

        if (clean.length === 14) {
            pushVariant(clean.slice(1), "gtin14-drop-leading-digit");
        }

        if (clean.length === 13 && clean.startsWith("0")) {
            pushVariant(clean.slice(1), "ean13-drop-leading-zero");
        }

        return variants;
    }

    async function httpGetText(url) {
        if (typeof requestUrl === "function") {
            const response = await requestUrl({ url, method: "GET" });
            return response.text;
        }

        const response = await fetch(url);
        return await response.text();
    }

    async function httpGetJson(url) {
        if (typeof requestUrl === "function") {
            const response = await requestUrl({ url, method: "GET" });
            return response.json;
        }

        const response = await fetch(url);
        return await response.json();
    }

    function stripHtml(value) {
        return String(value || "")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim();
    }

    function parseQuantity(quantity) {
        const quantityMatch = String(quantity || "").trim().match(/(\d+(?:[\.,]\d+)?)\s*(kg|g|гр|гр\.|l|ml|л|мл|pcs|шт)/i);
        if (!quantityMatch) {
            return { typical_pack_size: "", typical_pack_unit: "" };
        }

        return {
            typical_pack_size: Number(quantityMatch[1].replace(",", ".")),
            typical_pack_unit: String(quantityMatch[2]).toLowerCase().replace("гр.", "гр")
        };
    }

    function pushCandidate(candidates, candidate, dedupe) {
        const key = [candidate.source, candidate.lookup_code || candidate.barcode, candidate.title].join("|").toLowerCase();
        if (!candidate.title || dedupe.has(key)) return;
        dedupe.add(key);
        candidates.push(candidate);
    }

    function extractSearchBlocks(html, source) {
        const blocks = [];

        if (source === "duckduckgo") {
            const matches = [...String(html || "").matchAll(/result__title[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?result__snippet[^>]*>([\s\S]*?)<\/a?>/gi)];
            for (const match of matches.slice(0, 5)) {
                blocks.push({ title: stripHtml(match[1]), snippet: stripHtml(match[2]) });
            }
        }

        if (source === "bing") {
            const matches = [...String(html || "").matchAll(/<li class="b_algo"[\s\S]*?<h2><a[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi)];
            for (const match of matches.slice(0, 5)) {
                blocks.push({ title: stripHtml(match[1]), snippet: stripHtml(match[2]) });
            }
        }

        return blocks.filter(block => block.title && block.snippet);
    }

    async function fetchCandidatesByBarcode(barcode) {
        const candidates = [];
        const dedupe = new Set();

        for (const variant of buildBarcodeVariants(barcode)) {
            const clean = variant.code;
            try {
                const offData = await httpGetJson(`https://world.openfoodfacts.org/api/v2/product/${clean}.json`);
                if (offData && offData.product) {
                    const product = offData.product;
                    const title = product.product_name_ru
                        || product.product_name
                        || product.generic_name_ru
                        || product.generic_name
                        || "";

                    if (title) {
                        const quantity = parseQuantity(product.quantity || "");
                        pushCandidate(candidates, {
                            source: "openfoodfacts",
                            lookup_code: clean,
                            lookup_reason: variant.reason,
                            title,
                            barcode: cleanBarcode(barcode),
                            brand: String(product.brands || "").split(",")[0].trim(),
                            category: product.categories_tags?.[0]
                                ? String(product.categories_tags[0]).replace(/^en:/, "").replace(/^ru:/, "")
                                : (product.product_type || "прочее"),
                            description: String(product.generic_name_ru || product.generic_name || "").trim(),
                            typical_pack_size: quantity.typical_pack_size,
                            typical_pack_unit: quantity.typical_pack_unit,
                            perishable: true,
                            default_shelf_life_days: ""
                        }, dedupe);
                    }
                }
            } catch (error) {}

            try {
                const goUpcHtml = await httpGetText(`https://go-upc.com/search?q=${clean}`);
                const titleMatch = goUpcHtml.match(/<h1 class="product-name">([\s\S]*?)<\/h1>/i);
                const brandMatch = goUpcHtml.match(/<td class="metadata-label">Brand<\/td>\s*<td>([\s\S]*?)<\/td>/i);
                const categoryMatch = goUpcHtml.match(/<td class="metadata-label">Category<\/td>\s*<td>([\s\S]*?)<\/td>/i);
                const descriptionMatch = goUpcHtml.match(/<h2>\s*Description\s*<\/h2>\s*<span>([\s\S]*?)<\/span>/i);
                const goTitle = stripHtml(titleMatch?.[1] || "");

                if (goTitle) {
                    const quantity = parseQuantity(goTitle);
                    pushCandidate(candidates, {
                        source: "go-upc",
                        lookup_code: clean,
                        lookup_reason: variant.reason,
                        title: goTitle,
                        barcode: cleanBarcode(barcode),
                        brand: stripHtml(brandMatch?.[1] || ""),
                        category: stripHtml(categoryMatch?.[1] || "") || "прочее",
                        description: stripHtml(descriptionMatch?.[1] || ""),
                        typical_pack_size: quantity.typical_pack_size,
                        typical_pack_unit: quantity.typical_pack_unit,
                        perishable: false,
                        default_shelf_life_days: ""
                    }, dedupe);
                }
            } catch (error) {}

            try {
                const barcodeListHtml = await httpGetText(`https://barcode-list.ru/barcode/RU/Поиск.htm?barcode=${clean}`);
                const barcodeListTitleMatch = barcodeListHtml.match(/<title>([\s\S]*?)<\/title>/i);
                const listTitle = stripHtml(barcodeListTitleMatch?.[1] || "");
                const codePattern = new RegExp(`<td[^>]*>\\s*${clean}\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "gi");
                const nameMatches = [...barcodeListHtml.matchAll(codePattern)]
                    .map(match => stripHtml(match[1]))
                    .filter(Boolean);
                const titleCandidate = /Штрих-код:/i.test(listTitle)
                    ? listTitle.replace(/\s*-\s*Штрих-код:.*$/i, "").trim()
                    : "";
                const topName = nameMatches[0] || titleCandidate;

                if (topName) {
                    const quantity = parseQuantity(topName);
                    pushCandidate(candidates, {
                        source: "barcode-list",
                        lookup_code: clean,
                        lookup_reason: variant.reason,
                        title: topName,
                        barcode: cleanBarcode(barcode),
                        brand: topName.toLowerCase().includes("волжский пекарь") ? "Волжский пекарь" : "",
                        category: topName.toLowerCase().includes("ваф") ? "сладости" : "прочее",
                        description: nameMatches.slice(0, 5).join(" | "),
                        typical_pack_size: quantity.typical_pack_size,
                        typical_pack_unit: quantity.typical_pack_unit || "pcs",
                        perishable: false,
                        default_shelf_life_days: ""
                    }, dedupe);
                }
            } catch (error) {}

            for (const source of [
                { name: "duckduckgo", url: `https://duckduckgo.com/html/?q=${encodeURIComponent(`"${clean}"`)}` },
                { name: "bing", url: `https://www.bing.com/search?q=${encodeURIComponent(`"${clean}"`)}` }
            ]) {
                try {
                    const html = await httpGetText(source.url);
                    const blocks = extractSearchBlocks(html, source.name);
                    for (const block of blocks) {
                        pushCandidate(candidates, {
                            source: `web-search-${source.name}`,
                            lookup_code: clean,
                            lookup_reason: variant.reason,
                            title: block.title,
                            barcode: cleanBarcode(barcode),
                            brand: "",
                            category: "прочее",
                            description: block.snippet,
                            typical_pack_size: "",
                            typical_pack_unit: "",
                            perishable: false,
                            default_shelf_life_days: ""
                        }, dedupe);
                    }
                } catch (error) {}
            }
        }

        return candidates;
    }

    async function readConfig() {
        const defaults = {
            enabled: true,
            provider: "lmstudio",
            endpoint: "http://127.0.0.1:1234/v1",
            model: "qwen2.5-3b-instruct",
            temperature: 0.1,
            timeout_ms: 20000
        };

        const file = app.vault.getAbstractFileByPath(CONFIG_PATH);
        if (!file) return defaults;

        try {
            const raw = await app.vault.read(file);
            return { ...defaults, ...JSON.parse(raw) };
        } catch (error) {
            return defaults;
        }
    }

    function extractJsonObject(text) {
        const match = String(text || "").match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch (error) {
            return null;
        }
    }

    const config = await readConfig();
    const endpoint = String(config.endpoint || "").replace(/\/$/, "");
    const provider = String(config.provider || "lmstudio");
    const model = String(config.model || "");
    const barcodeInput = (await tp.system.prompt("Штрихкод для проверки LLM (опционально)", ""))?.trim() || "";
    const requestedBarcode = cleanBarcode(barcodeInput);
    const hasExplicitBarcode = requestedBarcode.length > 0;
    const liveCandidates = requestedBarcode ? await fetchCandidatesByBarcode(requestedBarcode) : [];
    const usedFallback = !hasExplicitBarcode;
    const testPayload = usedFallback
        ? {
            barcode: "4600702025989",
            candidates: [
                {
                    source: "go-upc",
                    title: "Barkhatnie ruchki Крем Для Рук Бархатные Ручки Защитный, 80 Мл",
                    brand: "Barkhatnie ruchki",
                    category: "beauty",
                    description: "Крем для рук защитный"
                }
            ]
        }
        : {
            barcode: requestedBarcode,
            candidates: liveCandidates
        };

    if (hasExplicitBarcode && testPayload.candidates.length === 0) {
        return [
            "# Проверка LLM",
            "",
            `- Provider: \`${provider}\``,
            `- Endpoint: \`${endpoint}\``,
            `- Model: \`${model}\``,
            `- Запрошенный штрихкод: \`${requestedBarcode}\``,
            `- Использован fallback пример: **нет**`,
            `- Найдено кандидатов: **0**`,
            "",
            "## Результат",
            "",
            "По этому штрихкоду не нашлось интернет-кандидатов в текущих источниках (`Open Food Facts`, `Go-UPC`).",
            "",
            "## Что делать дальше",
            "",
            "1. Добавить товар вручную и закрепить штрихкод в локальной базе.",
            "2. Позже расширить список внешних источников.",
            "3. Использовать этот штрихкод как локально известный после первого ручного подтверждения."
        ].join("\n");
    }
    const startedAt = Date.now();

    const prompt = [
        "Return only one JSON object.",
        "Schema:",
        '{"title":"","barcode":"","brand":"","category":"","base_unit":"pcs|g|kg|ml|l","typical_pack_size":"","typical_pack_unit":"pcs|g|kg|ml|l","perishable":false,"default_shelf_life_days":"","confidence":0}',
        "Normalize this candidate:",
        JSON.stringify(testPayload, null, 2)
    ].join("\n");

    try {
        let raw = "";

        if (provider === "lmstudio") {
            const response = await fetch(`${endpoint}/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model,
                    temperature: Number(config.temperature || 0.1),
                    response_format: { type: "text" },
                    messages: [
                        {
                            role: "system",
                            content: "You normalize barcode lookup candidates into strict JSON for a personal inventory database. Return only a JSON object."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                })
            });

            const data = await response.json();
            raw = data.choices?.[0]?.message?.content || "";
        } else if (provider === "ollama") {
            const response = await fetch(`${endpoint}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    format: "json",
                    options: {
                        temperature: Number(config.temperature || 0.1)
                    }
                })
            });
            const data = await response.json();
            raw = data.response || "";
        } else {
            return `# Проверка LLM\n\nНеизвестный provider: \`${provider}\``;
        }

        const elapsed = Date.now() - startedAt;
        const parsed = extractJsonObject(raw);

        return [
            "# Проверка LLM",
            "",
            `- Provider: \`${provider}\``,
            `- Endpoint: \`${endpoint}\``,
            `- Model: \`${model}\``,
            `- Запрошенный штрихкод: \`${requestedBarcode || "не указан"}\``,
            `- Использован fallback пример: **${usedFallback ? "да" : "нет"}**`,
            `- Найдено кандидатов: **${testPayload.candidates.length}**`,
            `- Время ответа: **${elapsed} ms**`,
            `- JSON распарсен: **${parsed ? "да" : "нет"}**`,
            "",
            "## Кандидаты",
            "",
            "```json",
            JSON.stringify(testPayload, null, 2),
            "```",
            "",
            "## Сырой ответ",
            "",
            "```json",
            raw || "",
            "```",
            "",
            "## Распарсенный объект",
            "",
            "```json",
            JSON.stringify(parsed, null, 2),
            "```"
        ].join("\n");
    } catch (error) {
        return [
            "# Проверка LLM",
            "",
            `- Provider: \`${provider}\``,
            `- Endpoint: \`${endpoint}\``,
            `- Model: \`${model}\``,
            `- Запрошенный штрихкод: \`${requestedBarcode || "не указан"}\``,
            "",
            "## Ошибка",
            "",
            "```text",
            String(error?.message || error),
            "```"
        ].join("\n");
    }
};
