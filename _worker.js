// دامنه ورکرتون یا نیم بهارو اینجا بزارید 
const Domain = 'https://nimbaha.363178.ir.cdn.ir'; 

// تنظیمات احراز هویت HTTP
const AUTH_ENABLED = false; // تغییر به true یا false برای فعال/غیرفعال کردن احراز هویت
const USERNAME = 'admin';  // نام کاربری را اینجا تغییر دهید
const PASSWORD = 'proxy123'; // رمز عبور را اینجا تغییر دهید

// کش برای ذخیره نتایج درخواست‌های تکراری
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

// تابع بررسی احراز هویت HTTP Basic
function checkAuth(request) {
    if (!AUTH_ENABLED) return true;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }

    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = atob(encodedCredentials);
    const [username, password] = decodedCredentials.split(':');

    return username === USERNAME && password === PASSWORD;
}

// تابع تشخیص فایل ویدیو
function isVideoFile(filename) {
    const videoExt = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
    const lower = filename.toLowerCase();
    return videoExt.some(ext => lower.endsWith(ext));
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (!pathname.endsWith('.css') && !pathname.endsWith('.js')) {
            if (!checkAuth(request)) {
                return new Response('Unauthorized', {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        'WWW-Authenticate': 'Basic realm="Multi-URL Proxy", charset="UTF-8"'
                    }
                });
            }
        }

        if (pathname === '/proxy') {
            const originalUrl = new URL(request.url).searchParams.get('url');
            if (!originalUrl) {
                return new Response('URL parameter is missing', { status: 400, headers: corsHeaders });
            }

            const cacheKey = originalUrl;
            if (cache.has(cacheKey)) {
                return new Response(JSON.stringify(cache.get(cacheKey)), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const urlWithoutParams = originalUrl.split('?')[0];
            const filename = urlWithoutParams.split('/').pop();

            const encodedData = toBase64(JSON.stringify({ url: originalUrl, filename }));
            const proxiedUrl = `${Domain}/dl/${encodedData}`;

            // فقط برای فایل‌های ویدیویی لینک پلیر ساخته میشه
            let responseData = {
                proxiedUrl,
                filename
            };
            if (isVideoFile(filename)) {
                responseData.playerUrl = `${Domain}/stream/${encodedData}`;
            }

            cache.set(cacheKey, responseData);

            return new Response(JSON.stringify(responseData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        else if (pathname.startsWith('/stream/')) {
            const base64Data = pathname.replace('/stream/', '');

            if (!base64Data) {
                return new Response('Data parameter is missing', { status: 400, headers: corsHeaders });
            }

            try {
                const decodedData = fromBase64(base64Data);
                const { url: originalUrl, filename } = JSON.parse(decodedData);
                const videoUrl = `${Domain}/dl/${base64Data}`;

                // محاسبه اندازه فایل (اختیاری اما مفید برای نمایش)
                let fileSize = 'Unknown';
                try {
                    const headResponse = await fetch(originalUrl, { method: 'HEAD' });
                    if (headResponse.ok) {
                        const contentLength = headResponse.headers.get('Content-Length');
                        if (contentLength) {
                            const sizeInMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
                            fileSize = `${sizeInMB} MB`;
                        }
                    }
                } catch (err) {
                    console.error('Failed to get file size:', err);
                }

                const htmlTemplate = `
                    <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LinkBolt Bot | {{file_name}}</title>
    <link rel="icon" href="https://i.ibb.co/pvMy0Np6/icon.png" type="image/x-icon" />
    <link rel="shortcut icon" href="https://i.ibb.co/pvMy0Np6/icon.png" type="image/x-icon" />
    <link rel="stylesheet" href="https://unpkg.com/sheryjs/dist/Shery.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/proavipatil/data@main/fs/src/style.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/proavipatil/data@main/fs/src/plyr.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@500;700&display=swap"
        rel="stylesheet"
    />
    <script src="https://cdn.tailwindcss.com"></script>
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <style>
        footer .icons {
            gap: 8px !important;
            margin-bottom: 4px !important;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        footer h5 {
            margin-top: 4px !important;
            font-family: 'Josefin Sans', sans-serif;
        }

        .downloadBtn img {
            width: 30px !important; /* عرض ثابت برای همه آیکون‌ها */
            height: 30px !important; /* ارتفاع ثابت برای همه آیکون‌ها */
            object-fit: contain; /* حفظ تناسب تصویر */
            vertical-align: middle; /* تراز عمودی با متن */
        }
    </style>
</head>

<body>
    <nav>
        <div class="nleft">
            <a href="#">
                <h3 id="heading" style="z-index: 100;" class="magnet title">LinkBolt</h3>
            </a>
        </div>
        <div class="nryt">
            <a class="home-btn magnet" href="#main" onclick="toggleWidthnav(this)">HOME</a>
            <a href="#abtus" class="about-btn magnet" onclick="toggleWidthnav(this)">ABOUT</a>
        </div>
    </nav>
    <center>
        <div class="about-nav">
            <a href="#abtus" class="wlcm magnet" onclick="toggleWidth(this)">WELCOME</a>
            <a href="#channels" class="abt-chnl magnet" onclick="toggleWidth(this)">CHANNELS</a>
            <a href="#contact" class="magnet contact-btn" onclick="toggleWidth(this)">CONTACT</a>
        </div>
    </center>

    <div class="outer">
        <div class="inner">
            <div class="main" id="main">
                <video
                    id="player"
                    class="player"
                    src="{{file_url}}"
                    type="video/mp4"
                    playsinline
                    controls
                    width="100%"
                ></video>
                <div class="player"></div>
                <div class="file-name">
                    <h4 style="display: inline;">File Name: </h4>
                    <p style="display: inline;" id="myDiv">{{file_name}}</p><br />
                    <h4 style="display: inline;">File Size: </h4>
                    <p style="display: inline;">{{file_size}}</p>
                </div>
            </div>
            <div class="abt">
                <div class="about">
                    <div class="about-dets">
                        <div class="abt-sec" id="abtus" style="padding: 160px 30px;">
                            <h1 style="text-align: center;">
                                WELCOME TO OUR <span>FILE STREAM</span> BOT
                            </h1>
                            <p
                                style="
                                    text-align: center;
                                    line-height: 2;
                                    word-spacing: 2px;
                                    letter-spacing: 0.8px;
                                "
                            >
                                This is a Telegram Bot to Stream
                                <span>Movies</span> and <span>Series</span> directly on Telegram.
                                You can also <span>download</span> them if you want. This bot is
                                developed by
                                <a href="https://t.me/mahdi79230"
                                    ><span style="font-weight: 700;">☬ 𐎶𐏃𐎭𐎴 ☬</span></a
                                ><br /><br />
                                If you like this bot, then don't forget to share it with your friends
                                and family.
                            </p>
                        </div>

                        <div class="abt-sec" id="channels">
                            <h1>
                                JOIN OUR <span>TELEGRAM</span> CHANNELS
                            </h1>
                            <div class="links chnl-link">
                                <a class="magnet" href="https://t.me/LinkBoltChannel">
                                    <button>LinkBolt channel</button>
                                </a>
                                <a class="magnet" href="https://t.me/ISVvpn">
                                    <button>ISVvpn</button>
                                </a>
                            </div>
                        </div>

                        <div class="abt-sec" id="contact">
                            <p style="text-align: center;">Report Bugs and Contact us on Telegram Below</p>
                            <div class="links contact">
                                <a href="https://t.me/mahdi79230">
                                    <button>CONTACT</button>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer>
            <center>
                <div class="copyright" style="text-align: center; margin-top: 10px; margin-bottom: 10px;">
                    <div
                        class="icons"
                        style="display: flex; justify-content: center; gap: 15px; margin-bottom: 20px; margin-top: 0;"
                    >
                        <a href="https://t.me/LinkBoltChannel" target="_blank" style="margin: 0;">
                            <i class="fa-brands fa-telegram fa-lg"></i>
                        </a>
                        <a href="https://www.instagram.com/mehdi_asgariii79" target="_blank" style="margin: 0;">
                            <i class="fa-brands fa-square-instagram fa-lg"></i>
                        </a>
                    </div>
                    <h5 class="text-center" style="margin: 0;">
                        Copyright © 2025
                        <a href="https://t.me/LinkBoltChannel">
                            <span style="font-weight: 700;">LinkBolt</span>
                        </a>
                        . All Rights Reserved.
                    </h5>
                </div>
            </center>
        </footer>
    </div>
</body>

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.155.0/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/automat/controlkit.js@master/bin/controlKit.min.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/sheryjs/dist/Shery.js"></script>
<script src="https://cdn.plyr.io/3.6.9/plyr.js"></script>
<script src="https://proavipatil.github.io/data/fs/src/script.js"></script>

</html>
                `;

                // جایگزینی placeholderها با مقادیر واقعی
                let html = htmlTemplate
                    .replaceAll('{{file_url}}', videoUrl)
                    .replaceAll('{{file_name}}', filename)
                    .replaceAll('{{file_size}}', fileSize);

                return new Response(html, {
                    headers: { ...corsHeaders, 'Content-Type': 'text/html' }
                });

            } catch (error) {
                return new Response(`Error: ${error.message}`, { status: 400, headers: corsHeaders });
            }
        }

        else if (pathname.startsWith('/dl/')) {
            const base64Data = pathname.replace('/dl/', '');
            if (!base64Data) {
                return new Response('Data parameter is missing', { status: 400, headers: corsHeaders });
            }

            try {
                const decodedData = fromBase64(base64Data);
                const { url: decodedUrl, filename } = JSON.parse(decodedData);

                const range = request.headers.get('Range');
                let fetchHeaders = new Headers(request.headers);

                const headResponse = await fetch(decodedUrl, { method: 'HEAD' });
                if (!headResponse.ok) {
                    throw new Error(`Failed to get file information: ${headResponse.status}`);
                }

                const contentLength = headResponse.headers.get('Content-Length');
                if (!contentLength) {
                    throw new Error('Could not determine file size');
                }

                const responseHeaders = new Headers();
                responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
                responseHeaders.set('Accept-Ranges', 'bytes');
                responseHeaders.set('Content-Length', contentLength);

                Object.keys(corsHeaders).forEach(key => {
                    responseHeaders.set(key, corsHeaders[key]);
                });

                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : parseInt(contentLength) - 1;

                    if (isNaN(start) || isNaN(end) || start < 0 || end >= parseInt(contentLength) || start > end) {
                        responseHeaders.set('Content-Range', `bytes */${contentLength}`);
                        return new Response('Invalid range', { 
                            status: 416, 
                            headers: responseHeaders 
                        });
                    }

                    const chunkSize = (end - start) + 1;

                    fetchHeaders.set('Range', `bytes=${start}-${end}`);
                    responseHeaders.set('Content-Range', `bytes ${start}-${end}/${contentLength}`);
                    responseHeaders.set('Content-Length', chunkSize.toString());

                    const rangeResponse = await fetch(decodedUrl, { headers: fetchHeaders });
                    if (!rangeResponse.ok && rangeResponse.status !== 206) {
                        throw new Error(`Failed to fetch range: ${rangeResponse.status}`);
                    }

                    const { readable, writable } = new TransformStream();
                    rangeResponse.body.pipeTo(writable).catch(err => console.error('Stream error:', err));

                    return new Response(readable, {
                        status: 206,
                        headers: responseHeaders
                    });
                } else {
                    const response = await fetch(decodedUrl, { headers: fetchHeaders });
                    if (!response.ok) {
                        throw new Error(`Failed to fetch file: ${response.status}`);
                    }

                    const { readable, writable } = new TransformStream();
                    response.body.pipeTo(writable).catch(err => console.error('Stream error:', err));

                    return new Response(readable, {
                        status: 200,
                        headers: responseHeaders
                    });
                }
            } catch (error) {
                return new Response(`Error: ${error.message}`, { 
                    status: 400, 
                    headers: corsHeaders 
                });
            }
        }

        else {
            const response = await env.ASSETS.fetch(request);
            const newHeaders = new Headers(response.headers);
            Object.keys(corsHeaders).forEach(key => {
                newHeaders.set(key, corsHeaders[key]);
            });
            return new Response(response.body, {
                status: response.status,
                headers: newHeaders,
            });
        }
    }
};