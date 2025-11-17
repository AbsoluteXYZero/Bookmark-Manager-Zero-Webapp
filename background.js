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

  console.log(`[Safety Check] Starting safety check for ${url}`);

  let result;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    console.log(`[Safety Check] Checking ${hostname} via VirusTotal (no whitelisting)`);

    // Send EVERYTHING to VirusTotal - no whitelisting or pre-filtering
    // Scrape VirusTotal for threat analysis
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(hostname)}`;
      console.log(`[VT Check] Fetching ${vtUrl}`);

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
      console.log(`[VT Check] Received HTML for ${hostname}, length: ${html.length}`);

      // Log larger sample to find embedded JSON state
      console.log(`[VT Check] First 1000 chars:`, html.substring(0, 1000));
      console.log(`[VT Check] Middle section:`, html.substring(3000, 4000));
      console.log(`[VT Check] End section:`, html.substring(html.length - 1000));

      // Look for common SPA state patterns
      const statePatterns = [
        /__INITIAL_STATE__/,
        /__NUXT__/,
        /window\.__data/,
        /"last_analysis_stats"/,
        /"last_analysis_results"/,
        /data-vue-meta/
      ];

      console.log('[VT Check] Searching for embedded state patterns:');
      statePatterns.forEach(pattern => {
        if (pattern.test(html)) {
          console.log(`  ✓ Found: ${pattern.source}`);
          // Extract the data around this pattern
          const index = html.search(pattern);
          if (index !== -1) {
            const context = html.substring(index, index + 500);
            console.log(`  Context:`, context);
          }
        }
      });

      // Try to extract script tag contents
      const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        console.log(`[VT Check] Found ${scriptMatches.length} script tags`);
        scriptMatches.slice(0, 5).forEach((script, i) => {
          if (script.length > 200 && script.length < 10000) {
            console.log(`  Script ${i + 1} (${script.length} chars):`, script.substring(0, 300));
          }
        });
      }

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
      let foundPatterns = [];

      for (const pattern of detectionPatterns) {
        const match = html.match(pattern);
        if (match) {
          const count = parseInt(match[1]);
          foundPatterns.push(`${pattern.source}: ${count}`);
          if (pattern.source.includes('malicious')) malicious = count;
          if (pattern.source.includes('suspicious')) suspicious = count;
          if (pattern.source.includes('positives')) malicious = Math.max(malicious, count);
        }
      }

      console.log(`[VT Check] ${hostname} - Found patterns: ${foundPatterns.join(', ')}`);
      console.log(`[VT Check] ${hostname} - Malicious: ${malicious}, Suspicious: ${suspicious}`);

      // Determine safety based on detections
      if (foundPatterns.length === 0) {
        console.warn(`[VT Check] No patterns matched for ${hostname} - VT scraping may be broken!`);
        result = 'unknown'; // Can't parse VT response
      } else if (malicious > 3) {
        result = 'unsafe'; // Multiple vendors flagged as malicious
      } else if (malicious > 0 || suspicious > 5) {
        result = 'warning'; // Some detections or many suspicious
      } else {
        result = 'safe'; // Clean or minimal detections
      }

      await setCachedResult(url, result, 'safetyStatusCache');
      return result;

    } catch (vtError) {
      console.error(`[VT Check] Error scraping VT for ${hostname}:`, vtError.message);
      // Fall back to unknown on error - something is broken
      result = 'unknown';
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

  if (request.action === "testVirusTotal") {
    // Manual VT test for debugging
    (async () => {
      try {
        const urlObj = new URL(request.url);
        const hostname = urlObj.hostname.toLowerCase();
        const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(hostname)}`;

        console.log(`[VT TEST] Manual test for ${hostname}`);
        console.log(`[VT TEST] Fetching ${vtUrl}`);

        const response = await fetch(vtUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0'
          }
        });

        console.log(`[VT TEST] Response status: ${response.status}`);
        console.log(`[VT TEST] Response headers:`, [...response.headers.entries()]);

        const html = await response.text();
        console.log(`[VT TEST] HTML length: ${html.length}`);
        console.log(`[VT TEST] First 1000 chars:`, html.substring(0, 1000));
        console.log(`[VT TEST] Search for "malicious":`, html.includes('malicious'));
        console.log(`[VT TEST] Search for "suspicious":`, html.includes('suspicious'));

        sendResponse({ success: true, htmlLength: html.length, status: response.status });
      } catch (error) {
        console.error(`[VT TEST] Error:`, error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
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