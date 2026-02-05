// ==UserScript==
// @name         YouTubeSubscriptionsListViewMode
// @namespace    marty-listview
// @version      1.3
// @description  Horizontal list with 220px thumbs and inline descriptions. Subs feed only.
// @match        https://www.youtube.com/feed/subscriptions*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const THUMB_WIDTH = 220;

    const css = `
ytd-rich-grid-renderer #contents { display: block !important; }
ytd-rich-item-renderer {
    display: block !important;
    width: 100% !important;
    padding: 12px 0 !important;
    border-bottom: 1px solid var(--yt-spec-10-percent-layer) !important;
}
.yt-lockup-view-model.yt-lockup-view-model--vertical {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
    gap: 16px !important;
}
.yt-lockup-view-model__content-image {
    width: ${THUMB_WIDTH}px !important;
    min-width: ${THUMB_WIDTH}px !important;
    max-width: ${THUMB_WIDTH}px !important;
    flex-shrink: 0 !important;
}
.yt-lockup-view-model__content-image img {
    width: 100% !important;
    height: auto !important;
    border-radius: 6px !important;
    object-fit: cover !important;
}
yt-lockup-metadata-view-model { flex: 1 !important; max-width: 100% !important; }
.yt-lockup-metadata-view-model__title {
    font-size: 1.15rem !important; font-weight: 600 !important; margin-bottom: 6px !important; line-height: 1.3 !important; white-space: normal !important;
}
.marty-meta-inline { font-size: 1.1rem !important; color: var(--yt-spec-text-secondary) !important; margin-bottom: 4px !important; }
.marty-desc { font-size: 1.5rem !important; color: var(--yt-spec-text-secondary) !important; line-height: 1.45 !important; white-space: normal !important; }
.yt-lockup-view-model__metadata { position: relative; display: flex; min-width: 0; flex-direction: column; width: 80%; }
`;

    const style = document.createElement('style');
    style.id = "marty-list-layout-style";
    style.textContent = css;
    document.documentElement.appendChild(style);

    function extractVideoId(href) {
        try {
            const url = new URL(href, location.origin);
            return url.searchParams.get('v');
        } catch {
            const m = href.match(/v=([^&]+)/);
            return m ? m[1] : null;
        }
    }

    async function fetchDescription(videoId) {
        if (!videoId) return '';
        try {
            const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { credentials: 'same-origin' });
            const html = await res.text();
            const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
            if (!match) return '';
            const json = JSON.parse(match[1]);
            let desc = json?.videoDetails?.shortDescription || '';
            const sentences = desc.match(/[^.!?]+[.!?]+/g) || [];
            return sentences.slice(0, 2).join(' ').trim();
        } catch { return ''; }
    }

    async function enhanceDescriptions() {
        if (!window.location.href.includes('/feed/subscriptions')) return;

        const items = document.querySelectorAll('ytd-rich-item-renderer yt-lockup-view-model');
        if (!items.length) return;

        for (const lockup of items) {
            if (lockup.dataset.martyDone === '1') continue;

            const thumbLink = lockup.querySelector('a.yt-lockup-view-model__content-image');
            if (!thumbLink) continue;

            const href = new URL(thumbLink.getAttribute('href'), location.origin).href;
            const videoId = extractVideoId(href);
            if (!videoId) continue;

            const metaContainer = lockup.querySelector('.yt-lockup-metadata-view-model__text-container') || lockup.querySelector('yt-lockup-metadata-view-model');
            if (!metaContainer) continue;

            const metaRows = lockup.querySelectorAll('.yt-content-metadata-view-model__metadata-row span');
            const metaLine = [metaRows?.[0]?.innerText, metaRows?.[1]?.innerText, metaRows?.[2]?.innerText].filter(Boolean).join(' • ');

            const metaDiv = document.createElement('div');
            metaDiv.className = 'marty-meta-inline';
            metaDiv.textContent = metaLine;

            const descDiv = document.createElement('div');
            descDiv.className = 'marty-desc';
            descDiv.textContent = '…';

            metaContainer.appendChild(metaDiv);
            metaContainer.appendChild(descDiv);

            lockup.dataset.martyDone = '1';

            const desc = await fetchDescription(videoId);
            descDiv.textContent = desc || 'No description available';
        }
    }

    function init() {
        setTimeout(enhanceDescriptions, 800);
        setTimeout(enhanceDescriptions, 2000);
        setTimeout(enhanceDescriptions, 4000); // Extra delay for slow loading
    }

    window.addEventListener('yt-navigate-finish', init);
    window.addEventListener('load', init);
    init(); // Run immediately
})();