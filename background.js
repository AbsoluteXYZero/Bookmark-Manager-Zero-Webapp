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

    console.log(`[Safety Check] Checking ${url} via VirusTotal UI Search API`);

    // Use the WORKING endpoint discovered from Firefox Network tab!
    // Two-step process:
    // 1. Search: /ui/search?query={url} -> get URL ID
    // 2. Fetch: /ui/urls/{id} -> get threat data
    try {
      // Step 1: Search for the URL to get its ID
      const searchUrl = `https://www.virustotal.com/ui/search?limit=1&query=${encodeURIComponent(url)}`;
      console.log(`[VT Search] Step 1: Searching for URL: ${searchUrl}`);

      const searchController = new AbortController();
      const searchTimeout = setTimeout(() => searchController.abort(), 15000);

      const searchResponse = await fetch(searchUrl, {
        signal: searchController.signal,
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
          'Referer': 'https://www.virustotal.com/',
          'Origin': 'https://www.virustotal.com'
        }
      });

      clearTimeout(searchTimeout);

      console.log(`[VT Search] Response status: ${searchResponse.status}`);

      if (!searchResponse.ok) {
        console.log(`[VT Search] Search failed with status ${searchResponse.status}`);
        result = 'unknown';
        await setCachedResult(url, result, 'safetyStatusCache');
        return result;
      }

      const searchData = await searchResponse.json();
      console.log(`[VT Search] Search results:`, searchData);

      // Extract URL ID from search results
      let urlId = null;
      if (searchData.data && searchData.data.length > 0) {
        // The ID is in the first result
        urlId = searchData.data[0].id;
        console.log(`[VT Search] Found URL ID: ${urlId}`);
      } else {
        console.log(`[VT Search] No results found for ${url}`);
        // No VT data = assume safe (not in VT database)
        result = 'safe';
        await setCachedResult(url, result, 'safetyStatusCache');
        return result;
      }

      // Step 2: Fetch detailed threat data for the URL
      const urlDetailsUrl = `https://www.virustotal.com/ui/urls/${urlId}`;
      console.log(`[VT Fetch] Step 2: Fetching URL details: ${urlDetailsUrl}`);

      const detailsController = new AbortController();
      const detailsTimeout = setTimeout(() => detailsController.abort(), 15000);

      const detailsResponse = await fetch(urlDetailsUrl, {
        signal: detailsController.signal,
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
          'Referer': 'https://www.virustotal.com/',
          'Origin': 'https://www.virustotal.com'
        }
      });

      clearTimeout(detailsTimeout);

      console.log(`[VT Fetch] Response status: ${detailsResponse.status}`);

      if (!detailsResponse.ok) {
        console.log(`[VT Fetch] Details fetch failed with status ${detailsResponse.status}`);
        result = 'unknown';
        await setCachedResult(url, result, 'safetyStatusCache');
        return result;
      }

      const detailsData = await detailsResponse.json();
      console.log(`[VT Fetch] URL details:`, detailsData);

      // Parse threat data
      let malicious = 0;
      let suspicious = 0;

      if (detailsData.data && detailsData.data.attributes) {
        const attrs = detailsData.data.attributes;

        // Get last_analysis_stats
        if (attrs.last_analysis_stats) {
          malicious = attrs.last_analysis_stats.malicious || 0;
          suspicious = attrs.last_analysis_stats.suspicious || 0;
          console.log(`[VT Fetch] Analysis stats - Malicious: ${malicious}, Suspicious: ${suspicious}`);
        }

        // Also log reputation if available
        if (attrs.reputation !== undefined) {
          console.log(`[VT Fetch] Reputation score: ${attrs.reputation}`);
        }

        // Log categories if available
        if (attrs.categories) {
          console.log(`[VT Fetch] Categories:`, attrs.categories);
        }
      }

      // Determine safety based on detections
      if (malicious > 3) {
        result = 'unsafe';
      } else if (malicious > 0 || suspicious > 5) {
        result = 'warning';
      } else {
        result = 'safe';
      }

      console.log(`[VT Fetch] Final result for ${url}: ${result}`);
      await setCachedResult(url, result, 'safetyStatusCache');
      return result;

    } catch (vtError) {
      console.error(`[VT Check] Error checking VT for ${url}:`, vtError.message);
      // Fall back to unknown on error
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
        // Add protocol if missing
        let testUrl = request.url;
        if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
          testUrl = 'https://' + testUrl;
        }

        const urlObj = new URL(testUrl);
        const hostname = urlObj.hostname.toLowerCase();

        console.log(`[VT TEST] Manual test for ${hostname}`);

        // WORKAROUND: Open VT homepage in background tab to establish cookies
        console.log(`[VT TEST] Opening VT homepage to establish cookies...`);
        const tab = await browser.tabs.create({
          url: 'https://www.virustotal.com/',
          active: false
        });

        // Wait 3 seconds for page to load and cookies to be set
        console.log(`[VT TEST] Waiting 3 seconds for cookies...`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Close the tab
        await browser.tabs.remove(tab.id);
        console.log(`[VT TEST] Cookies established, calling checkURLSafety...`);

        // Call the actual safety check function
        const result = await checkURLSafety(testUrl);

        console.log(`[VT TEST] Final result: ${result}`);

        sendResponse({ success: true, result, hostname });
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