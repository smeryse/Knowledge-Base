module.exports = async function foodReceiptApi(tp) {
    if (typeof requestUrl !== "function") {
        new Notice("Ошибка: requestUrl недоступен. Этот скрипт работает только внутри Obsidian.");
        throw new Error("requestUrl is not available");
    }
    const CONFIG_PATH = "Projects/Кухня/nalog-config.json";

    const HOST = "irkkt-mobile.nalog.ru:8888";
    const DEVICE_OS = "iOS";
    const CLIENT_VERSION = "2.9.0";
    const CLIENT_SECRET = "IyvrAbKt9h/8p6a7QPh8gpkXYQ4=";
    const OS = "Android";
    const USER_AGENT = "billchecker/2.9.0 (iPhone; iOS 13.6; Scale/2.00)";
    const ACCEPT_LANGUAGE = "ru-RU;q=1, en-US;q=0.9";

    let config = await readConfig();

    // Генерируем уникальный Device-Id при первом запуске
    if (!config.deviceId) {
        config.deviceId = crypto.randomUUID();
        await saveConfig();
    }
    const DEVICE_ID = config.deviceId;

    function notice(message, timeout = 8000) {
        new Notice(message, timeout);
    }

    function log(stage, detail) {
        console.log(`[foodReceiptApi] ${stage}:`, detail);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function readConfig() {
        try {
            const file = app.vault.getAbstractFileByPath(CONFIG_PATH);
            if (!file) return {};
            const content = await app.vault.read(file);
            return JSON.parse(content);
        } catch (e) {
            log("readConfig error", e.message);
            return {};
        }
    }

    async function saveConfig() {
        try {
            const content = JSON.stringify(config, null, 2);
            const file = app.vault.getAbstractFileByPath(CONFIG_PATH);
            if (file) {
                await app.vault.modify(file, content);
            } else {
                await app.vault.create(CONFIG_PATH, content);
            }
            log("saveConfig", "OK");
        } catch (e) {
            log("saveConfig error", e.message);
        }
    }

    function makeHeaders(extra = {}, isPost = false) {
        const h = {
            Accept: "*/*",
            "Device-OS": DEVICE_OS,
            "Device-Id": DEVICE_ID,
            clientVersion: CLIENT_VERSION,
            "Accept-Language": ACCEPT_LANGUAGE,
            "User-Agent": USER_AGENT,
            ...extra
        };
        if (isPost) {
            h["Content-Type"] = "application/json";
        }
        return h;
    }

    async function safeRequest(name, url, method, payload) {
        log(`${name} request`, { url, method });
        
        const options = {
            url: url,
            method: method,
            headers: makeHeaders(method === "POST" ? {} : {}, method === "POST")
        };
        if (payload) {
            options.body = JSON.stringify(payload);
        }
        
        log(`${name} options`, JSON.stringify(options, null, 2));
        
        // Retry loop for rate limiting
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const resp = await requestUrl(options);
                
                log(`${name} status`, resp.status);
                log(`${name} response keys`, Object.keys(resp));
                
                if (resp.status && (resp.status < 200 || resp.status >= 300)) {
                    if (resp.status === 429) {
                        const waitSec = (attempt + 1) * 10;
                        log(`${name} rate limited`, `waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries}`);
                        notice(`Слишком много запросов. Ждем ${waitSec} сек...`);
                        await delay(waitSec * 1000);
                        continue;
                    }
                    log(`${name} error body`, resp.text || "(empty)");
                    throw new Error(`HTTP ${resp.status}: ${resp.text || "empty body"}`);
                }
                
                if (resp.json !== undefined) {
                    log(`${name} json response`, JSON.stringify(resp.json).slice(0, 200));
                    return resp.json;
                } else if (resp.text !== undefined) {
                    log(`${name} text response`, resp.text.slice(0, 200));
                    try {
                        return JSON.parse(resp.text);
                    } catch (e) {
                        return { rawText: resp.text };
                    }
                } else {
                    return {};
                }
            } catch (e) {
                const msg = e.message || String(e);
                log(`${name} error`, msg);
                
                if (msg.includes("429") || msg.includes("rate") || msg.includes("Too Many Requests")) {
                    if (attempt < maxRetries - 1) {
                        const waitSec = (attempt + 1) * 10;
                        notice(`Слишком много запросов (${attempt + 1}/${maxRetries}). Ждем ${waitSec} сек...`);
                        await delay(waitSec * 1000);
                        continue;
                    }
                }
                
                throw e;
            }
        }
        
        throw new Error("Превышено количество попыток после rate limiting (429). Подождите минуту и попробуйте снова.");
    }

    async function apiPost(path, payload, extraHeaders = {}) {
        const url = `https://${HOST}${path}`;
        return await safeRequest("POST", url, "POST", payload);
    }

    async function apiGet(path, extraHeaders = {}) {
        const url = `https://${HOST}${path}`;
        return await safeRequest("GET", url, "GET", null);
    }

    async function requestPhoneAuth(phone) {
        const payload = {
            phone: phone,
            client_secret: CLIENT_SECRET,
            os: OS
        };
        log("requestPhoneAuth", phone);
        return await apiPost("/v2/auth/phone/request", payload);
    }

    async function verifyPhoneAuth(phone, code) {
        const payload = {
            phone: phone,
            client_secret: CLIENT_SECRET,
            code: code,
            os: OS
        };
        log("verifyPhoneAuth", { phone, code: "***" });
        const data = await apiPost("/v2/auth/phone/verify", payload);
        if (data.sessionId) {
            config.sessionId = data.sessionId;
            config.refreshToken = data.refresh_token;
            config.phone = phone;
            await saveConfig();
            log("verifyPhoneAuth saved", "OK");
        }
        return data;
    }

    async function doRefreshToken() {
        if (!config.refreshToken) return null;
        try {
            log("doRefreshToken", "attempting...");
            const payload = {
                refresh_token: config.refreshToken,
                client_secret: CLIENT_SECRET
            };
            const data = await apiPost("/v2/mobile/users/refresh", payload);
            if (data.sessionId) {
                config.sessionId = data.sessionId;
                config.refreshToken = data.refresh_token;
                await saveConfig();
                log("doRefreshToken", "success");
                return data;
            }
        } catch (e) {
            log("doRefreshToken error", e.message || String(e));
        }
        return null;
    }

    async function getTicketId(qr) {
        const payload = { qr: qr };
        log("getTicketId", { qr: qr.slice(0, 30) + "..." });
        const data = await apiPost("/v2/ticket", payload);
        if (!data.id) {
            throw new Error(`Нет ticketId в ответе: ${JSON.stringify(data)}`);
        }
        return data.id;
    }

    async function getTicketById(ticketId) {
        log("getTicketById", ticketId);
        return await apiGet(`/v2/tickets/${ticketId}`);
    }

    async function getTicket(qr) {
        let ticketId;
        try {
            ticketId = await getTicketId(qr);
        } catch (e) {
            const msg = e.message || String(e);
            log("getTicketId error", msg);
            if (msg.includes("401") || msg.includes("403") || msg.includes("session")) {
                if (config.refreshToken) {
                    const refreshed = await doRefreshToken();
                    if (refreshed) {
                        ticketId = await getTicketId(qr);
                    } else {
                        throw new Error("Сессия истекла. Авторизуйтесь заново.");
                    }
                } else {
                    throw new Error("Требуется авторизация.");
                }
            } else {
                throw e;
            }
        }
        return await getTicketById(ticketId);
    }

    async function interactiveAuth() {
        const phoneInput = await tp.system.prompt(
            "Введите телефон для авторизации в ФНС (+70000000000)",
            config.phone || ""
        );
        if (!phoneInput) return null;
        const phone = phoneInput.trim();
        log("interactiveAuth", { phone });

        try {
            await requestPhoneAuth(phone);
            notice(`Код отправлен на ${phone}`);
        } catch (e) {
            log("requestPhoneAuth error", e.message || String(e));
            notice(`Ошибка отправки SMS: ${e.message || String(e)}`);
            return false;
        }

        const codeInput = await tp.system.prompt("Введите код из SMS");
        if (!codeInput) return null;
        const code = codeInput.trim();

        try {
            const data = await verifyPhoneAuth(phone, code);
            if (data.sessionId) {
                notice("Авторизация успешна.");
                return true;
            } else {
                notice(`Ошибка авторизации: ${JSON.stringify(data).slice(0, 200)}`);
                return false;
            }
        } catch (e) {
            log("verifyPhoneAuth error", e.message || String(e));
            notice(`Ошибка проверки кода: ${e.message || String(e)}`);
            return false;
        }
    }

    async function ensureAuth() {
        log("ensureAuth", { hasSession: !!config.sessionId, hasRefresh: !!config.refreshToken });
        if (config.sessionId) return true;
        if (config.refreshToken) {
            const refreshed = await doRefreshToken();
            if (refreshed) return true;
        }
        return await interactiveAuth();
    }

    return {
        ensureAuth,
        interactiveAuth,
        getTicket,
        getTicketById,
        requestPhoneAuth,
        verifyPhoneAuth,
        doRefreshToken,
        readConfig,
        saveConfig,
        config
    };
};
