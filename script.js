document.getElementById('proxyForm').addEventListener('submit', async (e) => {
e.preventDefault();

// Get all URLs (one per line)  
const urlsText = document.getElementById('urlInput').value;  
const urls = urlsText.split('\n').filter(url => url.trim() !== '');  

// Clear previous results  
const resultsContainer = document.getElementById('results');  
resultsContainer.innerHTML = '';  

// Hide bulk actions until we have results  
document.getElementById('bulkActionsContainer').style.display = 'none';  

// Track all successful proxied URLs and their filenames  
const allProxiedUrls = [];  
const allFilenames = [];  

// محدود کردن تعداد درخواست‌های همزمان  
const maxConcurrentRequests = 3;  
let activeFetches = 0;  
const fetchQueue = [];  

async function queuedFetch(url) {  
    if (activeFetches >= maxConcurrentRequests) {  
        // اگر تعداد درخواست‌های فعال به حداکثر رسیده، به صف افزوده می‌شود  
        return new Promise(resolve => {  
            fetchQueue.push(() => {  
                activeFetches++;  
                return fetch(url)  
                    .then(response => {  
                        activeFetches--;  
                        processQueue();  
                        return resolve(response);  
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
        .then(response => {  
            activeFetches--;  
            processQueue();  
            return response;  
        })  
        .catch(error => {  
            activeFetches--;  
            processQueue();  
            throw error;  
        });  
}  

function processQueue() {  
    if (fetchQueue.length > 0 && activeFetches < maxConcurrentRequests) {  
        const nextFetch = fetchQueue.shift();  
        nextFetch();  
    }  
}  

// Process each URL  
for (const url of urls) {  
    const trimmedUrl = url.trim();  
    if (!trimmedUrl) continue;  

    try {  
        // Create a result container for this URL  
        const resultDiv = document.createElement('div');  
        resultDiv.className = 'result-item';  
        resultsContainer.appendChild(resultDiv);  

        // Show loading state  
        resultDiv.innerHTML = `  
            <div class="url-original">${trimmedUrl}</div>  
            <div class="loading">Processing...</div>  
        `;  

        // Fetch the proxied URL using our queue system  
        const response = await queuedFetch(`/proxy?url=${encodeURIComponent(trimmedUrl)}`);  
        const data = await response.json();  

        // Add to our collections  
        allProxiedUrls.push(data.proxiedUrl);  
        allFilenames.push(data.filename);  

        // Update the result container with the proxied URL  
        resultDiv.innerHTML = `  
            <div class="url-original">${trimmedUrl}</div>  
            <div class="url-proxied">${data.proxiedUrl}</div>  
            <div class="filename">نام فایل: ${data.filename}</div>  
            <div class="action-buttons">  
    <a class="download-btn" href="${data.proxiedUrl}" target="_blank">دانلود</a>  
    <a class="download-btn" href="${data.playerUrl}" target="_blank">پخش آنلاین 🎥</a>
    <button class="player-btn" data-url="${data.proxiedUrl}">کپی لینک</button>  
</div>  
        `;  

        // Add event listener to the copy button  
        resultDiv.querySelector('.copy-btn').addEventListener('click', function() {  
            const urlToCopy = this.getAttribute('data-url');  
            copyToClipboard(urlToCopy, this);  
        });  

    } catch (error) {  
        // Handle error  
        const resultDiv = document.createElement('div');  
        resultDiv.className = 'result-item error';  
        resultDiv.innerHTML = `  
            <div class="url-original">${trimmedUrl}</div>  
            <div class="error-message">Error: ${error.message}</div>  
        `;  
        resultsContainer.appendChild(resultDiv);  
    }  
}  

// Show the results container  
resultsContainer.style.display = 'block';  

// Show bulk actions if we have any results  
if (allProxiedUrls.length > 0) {  
    document.getElementById('bulkActionsContainer').style.display = 'flex';  

    // Add event listener for Copy All button  
    document.getElementById('copyAllBtn').addEventListener('click', function() {  
        copyToClipboard(allProxiedUrls.join('\n'), this, 'همه لینک ها در کلیپ بورد کپی شدند!');  
    });  

    // Add event listener for Download All button  
    document.getElementById('downloadAllBtn').addEventListener('click', function() {  
        downloadAllLinks(allProxiedUrls, allFilenames);  
    });  
}

});

// کش برای نگهداری درخواست‌های تکراری
const cache = new Map();

async function cachedFetch(url) {
if (cache.has(url)) {
return cache.get(url);
}

const response = await fetch(url);  
const data = await response.json();  
cache.set(url, data);  
return data;

}

// Function to copy text to clipboard
function copyToClipboard(text, buttonElement, message = 'کپی شد!') {
navigator.clipboard.writeText(text).then(function() {
// Show success message on button
const originalText = buttonElement.textContent;
buttonElement.textContent = 'Copied!';

// Reset button text after 2 seconds  
    setTimeout(() => {  
        buttonElement.textContent = originalText;  
    }, 2000);  

    // If this is a bulk action, also show message in the span  
    if (buttonElement.id === 'copyAllBtn') {  
        showActionMessage(message);  
    }  
})  
.catch(function(error) {  
    console.error('Could not copy text: ', error);  

    // Show error message  
    if (buttonElement.id === 'copyAllBtn') {  
        showActionMessage('Failed to copy. Try again.', true);  
    }  
});

}

// Function to download all links as a text file
function downloadAllLinks(urls, filenames) {
try {
// Create content for the text file
let content = '';
for (let i = 0; i < urls.length; i++) {
content += ${filenames[i]}:\n${urls[i]}\n;
}

// Create a blob with the content  
    const blob = new Blob([content], { type: 'text/plain' });  
    const url = URL.createObjectURL(blob);  

    // Create a temporary link and trigger the download  
    const downloadLink = document.createElement('a');  
    downloadLink.href = url;  
    downloadLink.download = `proxied_links_${new Date().toISOString().slice(0,10)}.txt`;  
    document.body.appendChild(downloadLink);  
    downloadLink.click();  
    document.body.removeChild(downloadLink);  

    // Release the object URL  
    URL.revokeObjectURL(url);  

    // Show success message  
    showActionMessage('Links downloaded as text file!');  

} catch (error) {  
    console.error('Could not download links: ', error);  
    showActionMessage('Failed to download. Try again.', true);  
}

}

// Function to show action messages
function showActionMessage(message, isError = false) {
const messageElement = document.getElementById('actionMessage');
messageElement.textContent = message;
messageElement.style.opacity = '1';

if (isError) {  
    messageElement.classList.add('error');  
} else {  
    messageElement.classList.remove('error');  
}  

setTimeout(() => {  
    messageElement.style.opacity = '0';  
}, 2000);

}