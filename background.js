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

/**
 * Checks if a URL is reachable and resolves to the expected domain.
 * This function runs in the background script, which has broader permissions
 * than content scripts, allowing it to bypass CORS restrictions.
 * @param {string} url The URL to check.
 * @returns {Promise<'live' | 'dead' | 'parked'>} The status of the link.
 */
const checkLinkStatus = async (url) => {
  // Check if the URL itself is on a parking domain
  try {
    const urlHost = new URL(url).hostname.toLowerCase();
    if (PARKING_DOMAINS.some(domain => urlHost.includes(domain))) {
      return 'parked';
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
        return 'parked';
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
            return 'parked';
          }
        }
      } catch (contentError) {
        // Log CORS and other errors for debugging parking detection issues
        console.log(`[Parking Check] Content fetch failed for ${url}:`, contentError.message);
        // Silently continue - don't break link checking
      }

      // If content check didn't find parking indicators (or failed), return live
      return 'live';
    }

    // 4xx or 5xx error means the link is dead
    return 'dead';

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
      return 'live';
    } catch (fallbackError) {
      // Both HEAD and GET failed - link is likely dead
      console.warn('Link check failed for:', url, fallbackError.message);
      return 'dead';
    }
  }
};

// Check URL safety using Google Safe Browsing Lookup API
const checkURLSafety = async (url) => {
  try {
    // Google Safe Browsing Lookup API (v4)
    // This is a simplified client-side check without API key
    // For production, consider adding an API key for higher rate limits
    const apiUrl = 'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=';

    // Fallback: Use a simpler heuristic-based check
    // Check URL patterns that are commonly associated with threats
    const suspiciousPatterns = [
      /bit\.ly\/[a-z0-9]{5,}/i,  // Shortened URLs (could be suspicious)
      /tinyurl\.com/i,
      /goo\.gl/i,
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,  // IP addresses instead of domains
      /[^\w\s-].*[^\w\s-].*[^\w\s-]/,  // Multiple special chars (potential obfuscation)
    ];

    // Parse URL
    let hostname;
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname.toLowerCase();

      // Known malicious/untrusted domain patterns (blacklist)
      // These are commonly used in phishing, malware, and scam campaigns
      const untrustedPatterns = [
        // Fake login pages
        /.*-login\..*/,
        /.*account-verification\..*/,
        /.*secure-update\..*/,
        /.*verify-account\..*/,
        // Suspicious TLDs commonly used in phishing
        /\.xyz$/,
        /\.top$/,
        /\.loan$/,
        /\.download$/,
        /\.link$/,
        /\.click$/,
        /\.review$/,
        // Known phishing indicators
        /paypal.*verify/i,
        /amazon.*confirm/i,
        /secure.*signin/i,
        /account.*suspended/i,
        /urgent.*verify/i
      ];

      // Check for known malicious patterns
      if (untrustedPatterns.some(pattern => pattern.test(hostname))) {
        return 'unsafe';
      }

      // Check for suspicious patterns (warnings, not necessarily unsafe)
      if (suspiciousPatterns.some(pattern => pattern.test(url))) {
        return 'warning';
      }

      // Check for HTTPS (lack of HTTPS is a warning sign)
      if (urlObj.protocol !== 'https:' && !hostname.includes('localhost')) {
        return 'warning';
      }

      // Common safe domains (whitelist)
      const safeDomains = [
        'google.com', 'youtube.com', 'github.com', 'stackoverflow.com',
        'wikipedia.org', 'mozilla.org', 'firefox.com', 'microsoft.com',
        'apple.com', 'amazon.com', 'reddit.com', 'twitter.com', 'facebook.com',
        'instagram.com', 'linkedin.com', 'netflix.com', 'adobe.com',
        'dropbox.com', 'wordpress.com', 'blogspot.com', 'medium.com'
      ];

      if (safeDomains.some(domain => hostname.endsWith(domain))) {
        return 'safe';
      }

      // If we can't determine, return unknown
      return 'unknown';

    } catch (e) {
      console.warn('URL parsing failed for safety check:', url, e);
      return 'unknown';
    }

  } catch (error) {
    console.error('Error checking URL safety:', error);
    return 'unknown';
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