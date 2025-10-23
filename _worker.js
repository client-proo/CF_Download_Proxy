const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch'); // برای درخواست‌های HTTP
const { URL } = require('url');

// تنظیمات اولیه
const TOKEN = '8455583300:AAEEqEvqXZMfjQS5bdnnJ-3CG5TPlnzD8fo'; // توکن ربات را از BotFather وارد کنید
const Domain = 'https://free.117016.ir.cdn.ir';

// تنظیمات احراز هویت (اختیاری)
const AUTH_ENABLED = false;
const USERNAME = 'admin';
const PASSWORD = 'proxy123';

// کش برای ذخیره نتایج درخواست‌های تکراری
const cache = new Map();

// تابع تبدیل به Base64
function toBase64(str) {
    return Buffer.from(unescape(encodeURIComponent(str))).toString('base64');
}

// تابع رمزگشایی از Base64
function fromBase64(b64) {
    try {
        return decodeURIComponent(escape(Buffer.from(b64, 'base64').toString()));
    } catch (error) {
        throw new Error('Invalid Base64 string');
    }
}

// تابع بررسی اینکه آیا فایل ویدیو است
function isVideoFile(filename) {
    const videoExt = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
    const lower = filename.toLowerCase();
    return videoExt.some(ext => lower.endsWith(ext));
}

// تابع تبدیل حجم فایل به فرمت خوانا
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ایجاد ربات
const bot = new TelegramBot(TOKEN, { polling: true });

// مدیریت پیام‌های ورودی
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // بررسی اینکه آیا پیام یک URL معتبر است
    let originalUrl;
    try {
        originalUrl = new URL(text);
    } catch (error) {
        bot.sendMessage(chatId, 'لطفاً یک URL معتبر وارد کنید.');
        return;
    }

    // احراز هویت (در صورت فعال بودن)
    if (AUTH_ENABLED) {
        // در اینجا می‌توانید منطق احراز هویت را اضافه کنید، مثلاً درخواست نام کاربری و رمز عبور
        bot.sendMessage(chatId, 'احراز هویت در این نسخه غیرفعال است.');
        return;
    }

    // بررسی کش
    const cacheKey = originalUrl.href;
    if (cache.has(cacheKey)) {
        const cachedData = cache.get(cacheKey);
        bot.sendMessage(chatId, `نام فایل: ${cachedData.filename}\nحجم فایل: ${cachedData.fileSize}\nلینک پروکسی‌شده: ${cachedData.proxiedUrl}`);
        return;
    }

    try {
        // استخراج نام فایل
        const urlWithoutParams = originalUrl.pathname.split('?')[0];
        const filename = urlWithoutParams.split('/').pop();

        // درخواست HEAD برای دریافت حجم فایل
        const headResponse = await fetch(originalUrl.href, { method: 'HEAD' });
        if (!headResponse.ok) {
            throw new Error(`خطا در دریافت اطلاعات فایل: ${headResponse.status}`);
        }

        const contentLength = headResponse.headers.get('Content-Length');
        if (!contentLength) {
            throw new Error('نمی‌توان حجم فایل را تعیین کرد.');
        }

        // رمزگذاری داده‌ها به Base64
        const encodedData = toBase64(JSON.stringify({ url: originalUrl.href, filename }));
        const proxiedUrl = `${Domain}/dl/${encodedData}`;

        // آماده‌سازی پاسخ
        let responseData = {
            proxiedUrl,
            filename,
            fileSize: formatFileSize(parseInt(contentLength))
        };

        // ذخیره در کش
        cache.set(cacheKey, responseData);

        // ارسال پاسخ به کاربر
        let responseMessage = `نام فایل: ${filename}\nحجم فایل: ${responseData.fileSize}\nلینک پروکسی‌شده: ${proxiedUrl}`;
        if (isVideoFile(filename)) {
            const playerUrl = `${Domain}/stream/${encodedData}`;
            responseMessage += `\nلینک پخش: ${playerUrl}`;
        }

        bot.sendMessage(chatId, responseMessage);
    } catch (error) {
        bot.sendMessage(chatId, `خطا: ${error.message}`);
    }
});

// مدیریت خطاها
bot.on('polling_error', (error) => {
    console.error('خطای Polling:', error);
});

console.log('ربات تلگرامی در حال اجرا است...');