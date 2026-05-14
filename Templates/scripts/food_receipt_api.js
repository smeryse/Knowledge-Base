module.exports = async function foodReceiptApi(tp) {
    const CONFIG_PATH = "Projects/Кухня/nalog-config.json";

    const HOST = "irkkt-mobile.nalog.ru:8888";
    const DEVICE_OS = "iOS";
    const CLIENT_VERSION = "2.9.0";
    const CLIENT_SECRET = "IyvrAbKt9h/8p6a7QPh8gpkXYQ4=";
    const OS = "Android";
    const USER_AGENT = "billchecker/2.9.0 (iPhone; iOS 13.6; Scale/2.00)";
    const ACCEPT_LANGUAGE = "ru-RU;q=1, en-US;q=0.9";

    let config = await readConfig();

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
        } catch (e) {
            log("saveConfig error", e.message);
        }
    }

    function makeHeaders(extra = {}) {
        return {
            Accept: "*/*",
            "Device-OS": DEVICE_OS,
            "Device-Id": DEVICE_ID,
            clientVersion: CLIENT_VERSION,
            "Accept-Language": ACCEPT_LANGUAGE,
            "User-Agent": USER_AGENT,
            ...extra
        };
    }

    async function safeRequest(name, url, method, payload) {
        log(`${name} request`, { url, method });

        const options = {
            url: url,
            method: method,
            headers: makeHeaders(),
            throw: false
        };
        
        if (payload) {
            options.contentType = "application/json";
            options.body = JSON.stringify(payload);
        }

        log(`${name} options`, JSON.stringify({ ...options, body: options.body?.slice(0, 200) }));

        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const resp = await requestUrl(options);
                
                log(`${name} status`, resp.status);
                
                if (resp.status === 429) {
                    const waitSec = (attempt + 1) * 10;
                    notice(`Слишком много запросов. Ждем ${waitSec} сек...`);
                    await delay(waitSec * 1000);
                    continue;
                }

                if (resp.status >= 200 && resp.status < 300) {
                    log(`${name} success`, JSON.stringify(resp.json).slice(0, 200));
                    return resp.json || {};
                }

                // Non-2xx but not rate limited
                const errText = resp.text || `HTTP ${resp.status}`;
                log(`${name} error response`, errText.slice(0, 300));
                throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
                
            } catch (e) {
                const msg = e.message || String(e);
                log(`${name} error`, msg);
                
                if (msg.includes("429") && attempt < maxRetries - 1) {
                    const waitSec = (attempt + 1) * 10;
                    await delay(waitSec * 1000);
                    continue;
                }
                
                if (msg.includes("ERR_INVALID_ARGUMENT")) {
                    throw new Error(
                        "API ФНС недоступен напрямую из Obsidian на этой платформе (net::ERR_INVALID_ARGUMENT). " +
                        "Используйте Python-скрипт nalog_python.py отдельно, а потом вставьте результат в заметку."
                    );
                }
                
                throw e;
            }
        }
        
        throw new Error("Превышено количество попыток. Подождите минуту.");
    }

    async function apiPost(path, payload) {
        const url = `https://${HOST}${path}`;
        return await safeRequest("POST", url, "POST", payload);
    }

    async function apiGet(path) {
        const url = `https://${HOST}${path}`;
        return await safeRequest("GET", url, "GET", null);
    }

    async function requestPhoneAuth(phone) {
        return await apiPost("/v2/auth/phone/request", {
            phone: phone,
            client_secret: CLIENT_SECRET,
            os: OS
        });
    }

    async function verifyPhoneAuth(phone, code) {
        const data = await apiPost("/v2/auth/phone/verify", {
            phone: phone,
            client_secret: CLIENT_SECRET,
            code: code,
            os: OS
        });
        if (data.sessionId) {
            config.sessionId = data.sessionId;
            config.refreshToken = data.refresh_token;
            config.phone = phone;
            await saveConfig();
        }
        return data;
    }

    async function doRefreshToken() {
        if (!config.refreshToken) return null;
        try {
            const data = await apiPost("/v2/mobile/users/refresh", {
                refresh_token: config.refreshToken,
                client_secret: CLIENT_SECRET
            });
            if (data.sessionId) {
                config.sessionId = data.sessionId;
                config.refreshToken = data.refresh_token;
                await saveConfig();
                return data;
            }
        } catch (e) {
            log("refresh error", e.message || String(e));
        }
        return null;
    }

    async function getTicketId(qr) {
        const data = await apiPost("/v2/ticket", { qr: qr });
        if (!data.id) {
            throw new Error(`Нет ticketId: ${JSON.stringify(data)}`);
        }
        return data.id;
    }

    async function getTicketById(ticketId) {
        return await apiGet(`/v2/tickets/${ticketId}`);
    }

    async function getTicket(qr) {
        let ticketId;
        try {
            ticketId = await getTicketId(qr);
        } catch (e) {
            const msg = e.message || String(e);
            if (msg.includes("401") || msg.includes("403")) {
                if (config.refreshToken) {
                    const refreshed = await doRefreshToken();
                    if (refreshed) {
                        ticketId = await getTicketId(qr);
                    } else {
                        throw new Error("Сессия истекла.");
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

        try {
            await requestPhoneAuth(phone);
            notice(`Код отправлен на ${phone}`);
        } catch (e) {
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
                notice(`Ошибка: ${JSON.stringify(data).slice(0, 200)}`);
                return false;
            }
        } catch (e) {
            notice(`Ошибка проверки кода: ${e.message || String(e)}`);
            return false;
        }
    }

    async function ensureAuth() {
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
