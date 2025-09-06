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
                const { filename } = JSON.parse(decodedData);
                const videoUrl = `${Domain}/dl/${base64Data}`;

                const html = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>${filename}</title>
                        <style>
                            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0091ff; }
                            video { max-width: 100%; max-height: 100%; }
                        </style>
                    </head>
                    <body>
                        <video controls autoplay>
                            <source src="${videoUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </body>
                    </html>
                `;

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