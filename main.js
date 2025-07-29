const targetURL = "https://hentairead.com/hentai/elite-complex/"; // Test target

console.log("scraper starting...");

async function fetchAndSanitize(url) {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');

    const baseUrl = new URL(url);

    // Remove ads, tracking, noise
    const adSelectors = [
        'script[src*="ads"]',
        'iframe[src*="ads"]',
        'div[id*="ad"]',
        'div[class*="ad"]',
        'script', 'iframe', 'style', 'noscript'
    ];
    adSelectors.forEach(sel => doc.querySelectorAll(sel).forEach(el => el.remove()));

    // Inline all external CSS
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    for (let link of links) {
        let href = link.getAttribute('href');
        if (!href.startsWith('http')) {
            href = new URL(href, baseUrl).href;
        }

        try {
            const cssRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(href)}`);
            const cssData = await cssRes.json();
            const style = doc.createElement('style');
            style.textContent = cssData.contents;
            link.replaceWith(style);
        } catch (e) {
            console.warn('Failed to inline CSS:', href, e);
        }
    }

    // Patch images with lazy-loading
    doc.querySelectorAll('img[data-src]').forEach(img => {
        img.setAttribute('src', img.getAttribute('data-src'));
        img.removeAttribute('data-src');
    });

    // Inject reader layout styles
    const readerStyle = document.createElement('style');
    readerStyle.textContent = `
        body {
            background-color: #111;
            color: #eee;
            margin: 0;
            padding: 0;
            font-family: sans-serif;
        }

        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 10px auto;
        }

        .reader-container, .gallery, .page, .reader, .main-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 12px;
        }
    `;
    doc.head.appendChild(readerStyle);

    // Fallback: Wrap all images if layout is still off
    const allImages = Array.from(doc.querySelectorAll('img')).filter(img => img.naturalWidth > 100 || img.getAttribute('src'));
    if (allImages.length > 0) {
        const wrapper = doc.createElement('div');
        wrapper.className = 'reader-container';

        allImages.forEach(img => {
            wrapper.appendChild(img);
        });

        doc.body.innerHTML = '';
        doc.body.appendChild(wrapper);
    }

    return doc.documentElement.outerHTML;
}

(async () => {
    const sanitized = await fetchAndSanitize(targetURL);
    const blob = new Blob([sanitized], { type: "text/html" });
    const blobURL = URL.createObjectURL(blob);
    document.getElementById("viewer").src = blobURL;
    console.log("scraper ran ✅");
})();
