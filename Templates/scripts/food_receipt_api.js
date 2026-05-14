module.exports = async function foodReceiptApi(tp) {
    const CONFIG_PATH = "Projects/Кухня/nalog-config.json";

    const HOST = "irkkt-mobile.nalog.ru:8888";
    const DEVICE_OS = "iOS";
    const CLIENT_VERSION = "2.9.0";
    const DEVICE_ID = "7C82010F-16CC-446B-8F66-FC4080C66521";
    const CLIENT_SECRET = "IyvrAbKt9h/8p6a7QPh8gpkXYQ4=";
    const OS = "Android";
    const USER_AGENT = "billchecker/2.9.0 (iPhone; iOS 13.6; Scale/2.00)";
    const ACCEPT_LANGUAGE = "ru-RU;q=1, en-US;q=0.9";

    let config = await readConfig();

    function notice(message, timeout = 5000) {
        new Notice(message, timeout);
    }

    async function readConfig() {
        const file = app.vault.getAbstractFileByPath(CONFIG_PATH);
        if (!file) return {};
        try {
            const content = await app.vault.read(file);
            return JSON.parse(content);
        } catch (e) {
            return {};
        }
    }

    async function saveConfig() {
        const file = app.vault.getAbstractFileByPath(CONFIG_PATH);
        const content = JSON.stringify(config, null, 2);
        if (file) {
            await app.vault.modify(file, content);
        } else {
            await app.vault.create(CONFIG_PATH, content);
        }
    }

    function makeHeaders(extra = {}) {
        return {
            Host: HOST,
            Accept: "*/*",
            "Device-OS": DEVICE_OS,
            "Device-Id": DEVICE_ID,
            clientVersion: CLIENT_VERSION,
            "Accept-Language": ACCEPT_LANGUAGE,
            "User-Agent": USER_AGENT,
            ...extra
        };
    }

    async function apiPost(path, payload, extraHeaders = {}) {
        const url = `https://${HOST}${path}`;
        const resp = await requestUrl({
            url,
            method: "POST",
            headers: makeHeaders(extraHeaders),
            body: JSON.stringify(payload)
        });
        return resp.json;
    }

    async function apiGet(path, extraHeaders = {}) {
        const url = `https://${HOST}${path}`;
        const resp = await requestUrl({
            url,
            method: "GET",
            headers: makeHeaders(extraHeaders)
        });
        return resp.json;
    }

    async function requestPhoneAuth(phone) {
        const payload = {
            phone: phone,
            client_secret: CLIENT_SECRET,
            os: OS
        };
        return await apiPost("/v2/auth/phone/request", payload);
    }

    async function verifyPhoneAuth(phone, code) {
        const payload = {
            phone: phone,
            client_secret: CLIENT_SECRET,
            code: code,
            os: OS
        };
        const data = await apiPost("/v2/auth/phone/verify", payload);
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
        const payload = {
            refresh_token: config.refreshToken,
            client_secret: CLIENT_SECRET
        };
        try {
            const data = await apiPost("/v2/mobile/users/refresh", payload);
            if (data.sessionId) {
                config.sessionId = data.sessionId;
                config.refreshToken = data.refresh_token;
                await saveConfig();
                return data;
            }
        } catch (e) {
            notice("Не удалось обновить токен. Нужна повторная авторизация.");
        }
        return null;
    }

    async function getTicketId(qr) {
        const payload = { qr: qr };
        const extra = config.sessionId ? { sessionId: config.sessionId } : {};
        const data = await apiPost("/v2/ticket", payload, extra);
        if (!data.id) {
            throw new Error(`Не удалось получить ticketId: ${JSON.stringify(data)}`);
        }
        return data.id;
    }

    async function getTicketById(ticketId) {
        const extra = config.sessionId ? { sessionId: config.sessionId } : {};
        return await apiGet(`/v2/tickets/${ticketId}`, extra);
    }

    async function getTicket(qr) {
        let ticketId;
        try {
            ticketId = await getTicketId(qr);
        } catch (e) {
            if (config.refreshToken) {
                const refreshed = await doRefreshToken();
                if (refreshed) {
                    ticketId = await getTicketId(qr);
                } else {
                    throw new Error("Сессия истекла. Авторизуйтесь заново.");
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

        await requestPhoneAuth(phone);
        notice(`Код отправлен на ${phone}`);

        const codeInput = await tp.system.prompt("Введите код из SMS");
        if (!codeInput) return null;
        const code = codeInput.trim();

        const data = await verifyPhoneAuth(phone, code);
        if (data.sessionId) {
            notice("Авторизация успешна.");
            return true;
        } else {
            notice(`Ошибка авторизации: ${JSON.stringify(data)}`);
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
