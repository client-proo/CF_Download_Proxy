const Domain = 'https://free.117016.ir.cdn.ir';
const TOKEN = '8455583300:AAEEqEvqXZMfjQS5bdnnJ-3CG5TPlnzD8fo'; // توکن ربات را وارد کنید
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const cache = new Map();

function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(b64) {
    try {
        return decodeURIComponent(escape(atob(b64)));
    } catch (error) {
        throw new Error('Invalid Base64 string');
    }
}

function isVideoFile(filename) {
    const videoExt = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
    const lower = filename.toLowerCase();
    return videoExt.some(ext => lower.endsWith(ext));
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function sendTelegramMessage(chatId, text) {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
    });
    return response.ok;
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/webhook') {
            const update = await request.json();
            const chatId = update.message?.chat?.id;
            const text = update.message?.text;

            if (!chatId || !text) {
                return new Response('Invalid message', { status: 400 });
            }

            let originalUrl;
            try {
                originalUrl = new URL(text);
            } catch (error) {
                await sendTelegramMessage(chatId, 'لطفاً یک URL معتبر وارد کنید.');
                return new Response('OK', { status: 200 });
            }

            const cacheKey = originalUrl.href;
            if (cache.has(cacheKey)) {
                const cachedData = cache.get(cacheKey);
                await sendTelegramMessage(chatId, `نام فایل: ${cachedData.filename}\nحجم فایل: ${cachedData.fileSize}\nلینک پروکسی‌شده: ${cachedData.proxiedUrl}`);
                return new Response('OK', { status: 200 });
            }

            try {
                const urlWithoutParams = originalUrl.pathname.split('?')[0];
                const filename = urlWithoutParams.split('/').pop();

                const headResponse = await fetch(originalUrl.href, { method: 'HEAD' });
                if (!headResponse.ok) {
                    throw new Error(`خطا در دریافت اطلاعات فایل: ${headResponse.status}`);
                }

                const contentLength = headResponse.headers.get('Content-Length');
                if (!contentLength) {
                    throw new Error('نمی‌توان حجم فایل را تعیین کرد.');
                }

                const encodedData = toBase64(JSON.stringify({ url: originalUrl.href, filename }));
                const proxiedUrl = `${Domain}/dl/${encodedData}`;

                let responseData = {
                    proxiedUrl,
                    filename,
                    fileSize: formatFileSize(parseInt(contentLength))
                };

                cache.set(cacheKey, responseData);

                let responseMessage = `نام فایل: ${filename}\nحجم فایل: ${responseData.fileSize}\nلینک پروکسی‌شده: ${proxiedUrl}`;
                if (isVideoFile(filename)) {
                    const playerUrl = `${Domain}/stream/${encodedData}`;
                    responseMessage += `\nلینک پخش: ${playerUrl}`;
                }

                await sendTelegramMessage(chatId, responseMessage);
                return new Response('OK', { status: 200 });
            } catch (error) {
                await sendTelegramMessage(chatId, `خطا: ${error.message}`);
                return new Response('OK', { status: 200 });
            }
        }

        return new Response('Webhook not found', { status: 404 });
    }
};