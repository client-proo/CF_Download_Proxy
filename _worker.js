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
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ heading }}</title>

    <meta name="description" content="Easily share and distribute files">
    <meta property="og:title" content="Thunder FileToLink">
    <meta property="og:description" content="File Streamer">
    <meta property="og:type" content="website">
    <meta property="og:image" content="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/FileToLink/live.png">
    <meta name="theme-color" content="#1a1a2e">
    <meta name="msapplication-navbutton-color" content="#1a1a2e">
    <meta name="apple-mobile-web-app-status-bar-style" content="#1a1a2e">
    <meta name="color-scheme" content="dark light">
    <meta name="application-name" content="Thunder FileToLink">
    
    <link rel="icon" href="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/FileToLink/Thunder.jpg">
    <link rel="apple-touch-icon" href="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/FileToLink/Thunder.jpg">

    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/FileToLink/reqstyle.css">
</head>
<body>
    <div class="loading-overlay" id="loading-overlay">
        <div class="loading-spinner">
            <div></div>
            <div></div>
        </div>
    </div>
    <button class="toggle-dark-mode" onclick="app.toggleDarkMode()" aria-label="Toggle Light/Dark Mode" aria-pressed="false" title="Toggle Light/Dark Mode"><i class="fas fa-moon"></i></button>
    <div class="bg-animation"><div class="bg-gradient"></div></div>

    <div class="container">
        <header class="header">
            <div class="file-info">
                <h1 id="file-name">{{ file_name }}</h1>
                <div class="file-meta"></div>
            </div>
        </header>

        <main id="main-content" role="main" aria-label="Main content">
            <div class="player-container">
                <{{ tag }} id="player" playsinline controls preload="metadata" controlsList="nodownload">
                <source src="{{ src }}" type="{{ tag }}/mp4">
                    Your browser does not support the {{ tag }} tag.
                </{{ tag }}>
            </div>

            <section class="controls-section" aria-label="File options">
                <div class="dropdown-container" id="stream-dropdown-container">
                    <button type="button" class="action-button secondary-button stream-btn" onclick="app.toggleStreamMenu(event)" aria-haspopup="true" aria-expanded="false" aria-controls="stream-menu" id="stream-btn-label">
                        <i class="fas fa-play-circle" aria-hidden="true"></i><span>Stream</span>
                    </button>
                    <div class="dropdown-menu" id="stream-menu" aria-labelledby="stream-btn-label">
                        <div class="stream-menu-header">
                            <h3>Open with external player</h3>
                            <button type="button" aria-label="Close menu" onclick="app.closeStreamMenu()" class="stream-menu-close">
                                <i class="fas fa-times" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div class="stream-menu-content" role="menu">
                            <div class="stream-category">
                                <div class="category-heading" role="presentation">
                                    <i class="fas fa-desktop" aria-hidden="true"></i>
                                    <span>Desktop Players</span>
                                </div>
                                <div class="player-grid">
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('vlc-pc')" title="Open in VLC Player (PC)">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/vlc.png" alt="VLC Player icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">VLC Player</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('potplayer')" title="Open in PotPlayer">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/FileToLink/pot.png" alt="PotPlayer icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">PotPlayer</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('mpc')" title="Open in MPC-HC">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/FileToLink/classic.png" alt="MPC-HC icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">MPC-HC</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('kmpc')" title="Open in KM Player (PC)">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/km.webp" alt="KM Player icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">KM Player</span>
                                    </button>
                                </div>
                            </div>
                            <div class="stream-category">
                                <div class="category-heading" role="presentation">
                                    <i class="fas fa-mobile-alt" aria-hidden="true"></i>
                                    <span>Mobile Players</span>
                                </div>
                                <div class="player-grid">
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('vlc')">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/vlc.png" alt="VLC Mobile icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">VLC Mobile</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('mxpro')">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/mx.png" alt="MX Pro icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">MX Pro</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('mx')">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/mx.png" alt="MX Player icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">MX Player</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('nplayer')">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/nPlayer.webp" alt="nPlayer icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">nPlayer</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('splayer')">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/splayer.webp" alt="S Player icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">S Player</span>
                                    </button>
                                    <button type="button" class="player-card dropdown-item" tabindex="0" role="menuitem" onclick="app.playOnline('km')">
                                        <div class="player-icon">
                                            <img src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/HydroStreamerBot/km.webp" alt="KM Player Mobile icon" loading="lazy" width="32" height="32">
                                        </div>
                                        <span class="player-name">KM Player</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <button type="button" class="action-button secondary-button" onclick="app.download()" title="Download the video"><i class="fas fa-cloud-download-alt" aria-hidden="true"></i><span>Download</span></button>
                <button type="button" class="action-button secondary-button" onclick="app.copyLink()" title="Copy video link"><i class="fas fa-link" aria-hidden="true"></i><span>Copy Link</span></button>
            </section>
        </main>
    </div>

    <footer>
        <p>Made by AI © 2025 | <a href="https://github.com/fyaz05/FileToLink" target="_blank" rel="noopener noreferrer"><i class="fab fa-github" aria-hidden="true"></i> GitHub</a></p>
    </footer>

    <div class="toast" id="toast" role="alert" aria-live="polite" aria-hidden="true">
        <div class="toast-icon" aria-hidden="true"><i class="fas fa-info-circle"></i></div>
        <div class="toast-message">Action completed.</div>
    </div>

    <script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/fyaz05/Resources@main/FileToLink/reqscript.js"></script>
</body>
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