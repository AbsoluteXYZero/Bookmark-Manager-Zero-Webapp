// This script runs in the background and handles extension tasks.

const PARKING_DOMAINS = [
  'hugedomains.com',
  'godaddy.com',
  'namecheap.com',
  'sedo.com',
  'dan.com',
  'squadhelp.com',
  'afternic.com',
  'domainmarket.com',
  'uniregistry.com',
  'namesilo.com',
];

// Cache for link and safety checks (7 days TTL)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Get cached result if valid
const getCachedResult = async (url, cacheKey) => {
  try {
    const cache = await browser.storage.local.get(cacheKey);
    if (cache[cacheKey]) {
      const cached = cache[cacheKey][url];
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.result;
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e);
  }
  return null;
};

// Store result in cache
const setCachedResult = async (url, result, cacheKey) => {
  try {
    const cache = await browser.storage.local.get(cacheKey);
    const cacheData = cache[cacheKey] || {};
    cacheData[url] = {
      result,
      timestamp: Date.now()
    };
    await browser.storage.local.set({ [cacheKey]: cacheData });
  } catch (e) {
    console.warn('Cache write error:', e);
  }
};

/**
 * Checks if a URL is reachable and resolves to the expected domain.
 * This function runs in the background script, which has broader permissions
 * than content scripts, allowing it to bypass CORS restrictions.
 * @param {string} url The URL to check.
 * @returns {Promise<'live' | 'dead' | 'parked'>} The status of the link.
 */
const checkLinkStatus = async (url) => {
  // Check cache first
  const cached = await getCachedResult(url, 'linkStatusCache');
  if (cached) {
    console.log(`[Link Check] Using cached result for ${url}: ${cached}`);
    return cached;
  }

  let result;

  // Check if the URL itself is on a parking domain
  try {
    const urlHost = new URL(url).hostname.toLowerCase();
    if (PARKING_DOMAINS.some(domain => urlHost.includes(domain))) {
      result = 'parked';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }
  } catch (e) {
    // Invalid URL, continue with fetch attempt
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  try {
    // Try HEAD request first (lighter weight)
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow'
    });
    clearTimeout(timeoutId);

    // Check if redirected to parking domain
    if (response.redirected || response.url !== url) {
      const finalHost = new URL(response.url).hostname.toLowerCase();
      if (PARKING_DOMAINS.some(domain => finalHost.includes(domain))) {
        result = 'parked';
        await setCachedResult(url, result, 'linkStatusCache');
        return result;
      }
    }

    // Check for successful status codes
    if (response.ok || (response.status >= 300 && response.status < 400)) {
      // Try lightweight content check for parking indicators (with robust error handling)
      try {
        const contentController = new AbortController();
        const contentTimeout = setTimeout(() => contentController.abort(), 3000); // Short 3s timeout

        const contentResponse = await fetch(url, {
          method: 'GET',
          signal: contentController.signal,
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow'
        });
        clearTimeout(contentTimeout);

        // Only check if we got a successful response
        if (contentResponse.ok) {
          const html = await contentResponse.text();
          const htmlLower = html.toLowerCase();

          // Check for parking page indicators
          const parkingIndicators = [
            'domain for sale',
            'buy this domain',
            'domain is for sale',
            'this domain may be for sale',
            'this domain is for sale',
            'premium domain',
            'parked free',
            'domain parking',
            'parked domain',
            'buy now',
            'make an offer',
            'make offer',
            'expired domain',
            'domain expired',
            'register this domain',
            'purchase this domain',
            'acquire this domain',
            'get this domain',
            'domain is parked',
            'parking page',
            'coming soon',
            'under construction',
            'sedo domain parking',
            'sedo.com',
            'afternic.com/forsale',
            'afternic.com',
            'hugedomains.com',
            'bodis.com',
            'parkingcrew',
            'domain name is for sale',
            'inquire about this domain',
            'interested in this domain',
            'domain may be for sale',
            'brandable domain',
            'premium domains',
            'domain broker'
          ];

          if (parkingIndicators.some(indicator => htmlLower.includes(indicator))) {
            result = 'parked';
            await setCachedResult(url, result, 'linkStatusCache');
            return result;
          }
        }
      } catch (contentError) {
        // Log CORS and other errors for debugging parking detection issues
        console.log(`[Parking Check] Content fetch failed for ${url}:`, contentError.message);
        // Silently continue - don't break link checking
      }

      // If content check didn't find parking indicators (or failed), return live
      result = 'live';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }

    // 4xx or 5xx error means the link is dead
    result = 'dead';
    await setCachedResult(url, result, 'linkStatusCache');
    return result;

  } catch (error) {
    clearTimeout(timeoutId);

    // If HEAD fails, try GET with no-cors as fallback
    try {
      const fallbackController = new AbortController();
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 8000);

      const fallbackResponse = await fetch(url, {
        method: 'GET',
        signal: fallbackController.signal,
        mode: 'no-cors',
        credentials: 'omit',
        redirect: 'follow'
      });
      clearTimeout(fallbackTimeout);

      // no-cors mode returns opaque response, but if fetch succeeds, link is likely live
      result = 'live';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    } catch (fallbackError) {
      // Both HEAD and GET failed - link is likely dead
      console.warn('Link check failed for:', url, fallbackError.message);
      result = 'dead';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }
  }
};

// Check URL safety by scraping VirusTotal
// WARNING: For personal use only. May violate VirusTotal ToS if distributed.
const checkURLSafety = async (url) => {
  // Check cache first
  const cached = await getCachedResult(url, 'safetyStatusCache');
  if (cached) {
    console.log(`[Safety Check] Using cached result for ${url}: ${cached}`);
    return cached;
  }

  let result;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Quick check: Known safe domains - skip VirusTotal
    const safeDomains = [
      'google.com', 'youtube.com', 'github.com', 'stackoverflow.com',
      'wikipedia.org', 'mozilla.org', 'firefox.com', 'microsoft.com',
      'apple.com', 'amazon.com', 'reddit.com', 'twitter.com', 'facebook.com',
      'instagram.com', 'linkedin.com', 'netflix.com', 'adobe.com',
      'dropbox.com', 'wordpress.com', 'blogspot.com', 'medium.com',
      'npmjs.com', 'cloudflare.com', 'jsdelivr.com', 'cdnjs.com'
    ];

    if (safeDomains.some(domain => hostname.endsWith(domain))) {
      result = 'safe';
      await setCachedResult(url, result, 'safetyStatusCache');
      return result;
    }

    // Quick check: Obviously malicious patterns - skip VirusTotal
    const untrustedPatterns = [
      /.*-login\..*/, /.*account-verification\..*/, /.*secure-update\..*/,
      /\.xyz$/, /\.top$/, /\.loan$/, /\.download$/, /\.link$/,
      /\.click$/, /\.review$/, /\.tk$/, /\.ml$/, /\.ga$/, /\.cf$/, /\.gq$/,
      /paypal.*verify/i, /amazon.*confirm/i, /account.*suspended/i
    ];

    if (untrustedPatterns.some(pattern => pattern.test(hostname))) {
      result = 'unsafe';
      await setCachedResult(url, result, 'safetyStatusCache');
      return result;
    }

    // Scrape VirusTotal for threat analysis
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(hostname)}`;
      const response = await fetch(vtUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.log(`[VT Check] Failed to fetch VT for ${hostname}: ${response.status}`);
        result = 'safe'; // Default to safe if VT unavailable
        await setCachedResult(url, result, 'safetyStatusCache');
        return result;
      }

      const html = await response.text();

      // Look for detection indicators in the HTML
      // VT embeds data in script tags and meta tags
      const detectionPatterns = [
        /"malicious":\s*(\d+)/i,
        /"suspicious":\s*(\d+)/i,
        /"harmless":\s*(\d+)/i,
        /"undetected":\s*(\d+)/i,
        /positives['":\s]+(\d+)/i,
        /detection.*ratio['":\s]+(\d+)/i
      ];

      let malicious = 0;
      let suspicious = 0;

      for (const pattern of detectionPatterns) {
        const match = html.match(pattern);
        if (match) {
          const count = parseInt(match[1]);
          if (pattern.source.includes('malicious')) malicious = count;
          if (pattern.source.includes('suspicious')) suspicious = count;
          if (pattern.source.includes('positives')) malicious = Math.max(malicious, count);
        }
      }

      console.log(`[VT Check] ${hostname} - Malicious: ${malicious}, Suspicious: ${suspicious}`);

      // Determine safety based on detections
      if (malicious > 3) {
        result = 'unsafe'; // Multiple vendors flagged as malicious
      } else if (malicious > 0 || suspicious > 5) {
        result = 'warning'; // Some detections or many suspicious
      } else {
        result = 'safe'; // Clean or minimal detections
      }

      await setCachedResult(url, result, 'safetyStatusCache');
      return result;

    } catch (vtError) {
      console.log(`[VT Check] Error scraping VT for ${hostname}:`, vtError.message);
      // Fall back to safe on error (VT timeout, network issue, etc.)
      result = 'safe';
      await setCachedResult(url, result, 'safetyStatusCache');
      return result;
    }

  } catch (error) {
    console.error('Error in checkURLSafety:', error);
    result = 'unknown';
    await setCachedResult(url, result, 'safetyStatusCache');
    return result;
  }
};

// Listen for messages from the frontend
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkLinkStatus") {
    checkLinkStatus(request.url).then(status => {
      sendResponse({ status });
    });
    return true; // Required to indicate an asynchronous response.
  }

  if (request.action === "checkURLSafety") {
    checkURLSafety(request.url).then(status => {
      sendResponse({ status });
    });
    return true; // Required to indicate an asynchronous response.
  }

  if (request.action === "getPageContent") {
    fetch(request.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      })
      .then(text => sendResponse({ content: text }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Required for async response
  }

  if (request.action === "openReaderView") {
    const readerUrl = browser.runtime.getURL(`reader.html?url=${encodeURIComponent(request.url)}`);
    browser.tabs.create({ url: readerUrl });
    // This message doesn't need a response.
  }

  if (request.action === "openPrintView") {
    const printUrl = browser.runtime.getURL(`print.html?url=${encodeURIComponent(request.url)}`);
    browser.tabs.create({ url: printUrl });
    // This message doesn't need a response.
  }
});


// Handles the browser action (clicking the toolbar icon)
// When clicked, toggle the sidebar
try {
  browser.action.onClicked.addListener(() => {
    browser.sidebarAction.toggle();
  });
} catch (error) {
  console.error("Error setting up browser action listener:", error);
}