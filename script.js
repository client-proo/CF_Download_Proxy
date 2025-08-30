document.getElementById('proxyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const urlsText = document.getElementById('urlInput').value;
    const urls = urlsText.split('\n').filter(url => url.trim() !== '');
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    const bulkActionsContainer = document.getElementById('bulkActionsContainer');
    bulkActionsContainer.style.display = 'none';

    const allProxiedUrls = [];
    const allProxiedUrlsWithPlayer = [];
    const allFilenames = [];

    const maxConcurrentRequests = 3;
    let activeFetches = 0;
    const fetchQueue = [];

    async function queuedFetch(url) {
        if (activeFetches >= maxConcurrentRequests) {
            return new Promise(resolve => {
                fetchQueue.push(() => {
                    activeFetches++;
                    return fetch(url)
                        .then(response => {
                            activeFetches--;
                            processQueue();
                            resolve(response);
                        })
                        .catch(error => {
                            activeFetches--;
                            processQueue();
                            throw error;
                        });
                });
            });
        }
        activeFetches++;
        return fetch(url)
            .then(response => { activeFetches--; processQueue(); return response; })
            .catch(error => { activeFetches--; processQueue(); throw error; });
    }

    function processQueue() {
        if (fetchQueue.length > 0 && activeFetches < maxConcurrentRequests) {
            const nextFetch = fetchQueue.shift();
            nextFetch();
        }
    }

    for (const url of urls) {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) continue;

        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultsContainer.appendChild(resultDiv);
        resultDiv.innerHTML = `<div class="url-original">${trimmedUrl}</div><div class="loading">Processing...</div>`;

        try {
            const response = await queuedFetch(`/proxy?url=${encodeURIComponent(trimmedUrl)}`);
            const data = await response.json();

            allProxiedUrls.push(data.proxiedUrl);
            allProxiedUrlsWithPlayer.push(data);
            allFilenames.push(data.filename);

            resultDiv.innerHTML = `
                <div class="url-original">${trimmedUrl}</div>
                <div class="url-proxied">${data.proxiedUrl}</div>
                <div class="filename">نام فایل: ${data.filename}</div>
                <div class="action-buttons">
                    <a class="download-btn" href="${data.proxiedUrl}" target="_blank">دانلود</a>
                    <button class="copy-btn" data-url="${data.proxiedUrl}">کپی لینک</button>
                    ${data.playerUrl ? `<a class="play-btn" href="${data.playerUrl}" target="_blank">پخش آنلاین</a>` : ''}
                </div>
            `;

            resultDiv.querySelector('.copy-btn').addEventListener('click', function() {
                copyToClipboard(this.getAttribute('data-url'), this);
            });

        } catch (error) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'result-item error';
            resultDiv.innerHTML = `
                <div class="url-original">${trimmedUrl}</div>
                <div class="error-message">Error: ${error.message}</div>
            `;
            resultsContainer.appendChild(resultDiv);
        }
    }

    if (allProxiedUrls.length > 0) {
        bulkActionsContainer.style.display = 'flex';

        document.getElementById('copyAllBtn').addEventListener('click', function() {
            copyToClipboard(allProxiedUrls.join('\n'), this, 'All links copied to clipboard!');
        });

        document.getElementById('downloadAllBtn').addEventListener('click', function() {
            downloadAllLinks(allProxiedUrls, allFilenames);
        });

        document.getElementById('playAllBtn').addEventListener('click', function() {
            const videoLinks = allProxiedUrlsWithPlayer.filter(i => i.playerUrl);
            if (videoLinks.length === 0) {
                showActionMessage("هیچ لینک ویدیویی برای پخش آنلاین وجود ندارد!", true);
                return;
            }
            videoLinks.forEach(i => window.open(i.playerUrl, "_blank"));
        });
    }
});