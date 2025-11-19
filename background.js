// This script runs in the background and handles extension tasks.

// Version from manifest.json - single source of truth
const APP_VERSION = browser.runtime.getManifest().version;

// Encryption utilities inlined to avoid module loading issues
async function getDerivedKey() {
  const browserInfo = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(browserInfo);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptApiKey(encrypted) {
  if (!encrypted) return null;
  try {
    const key = await getDerivedKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

async function getDecryptedApiKey(keyName) {
  const result = await browser.storage.local.get(keyName);
  if (result[keyName]) {
    return await decryptApiKey(result[keyName]);
  }
  return null;
}

// URL validation utilities inlined to avoid module loading issues
const BLOCKED_SCHEMES = ['file', 'javascript', 'data', 'vbscript', 'about'];
const PRIVATE_IP_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^::1$/, /^fe80:/i, /^fc00:/i, /^fd00:/i, /^localhost$/i
];

function validateUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'Invalid URL: empty or not a string' };
  }
  let url;
  try {
    url = new URL(urlString.trim());
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
  const scheme = url.protocol.replace(':', '').toLowerCase();
  if (BLOCKED_SCHEMES.includes(scheme)) {
    return { valid: false, error: `Blocked URL scheme: ${scheme}` };
  }
  if (scheme !== 'http' && scheme !== 'https') {
    return { valid: false, error: `Only HTTP and HTTPS URLs are allowed` };
  }
  const hostname = url.hostname.toLowerCase();
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return { valid: false, error: 'Private/internal IP addresses are not allowed' };
    }
  }
  if (url.username || url.password) {
    return { valid: false, error: 'URLs with credentials are not allowed' };
  }
  return { valid: true, url: url.href };
}

function sanitizeUrl(urlString) {
  const validation = validateUrl(urlString);
  if (!validation.valid) {
    console.warn(`URL validation failed: ${validation.error}`);
    return null;
  }
  return validation.url;
}

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

  // Use a standard browser User-Agent to avoid being blocked
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    // Try HEAD request first (lighter weight)
    // Note: Don't use mode: 'cors' - background scripts have broader permissions
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'follow',
      headers: headers
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
          credentials: 'omit',
          redirect: 'follow',
          headers: headers
        });
        clearTimeout(contentTimeout);

        // Only check if we got a successful response
        if (contentResponse.ok) {
          const html = await contentResponse.text();
          const htmlLower = html.toLowerCase();

          // Real websites typically have substantial content
          // Parked pages are usually very simple (<30KB)
          const contentSize = html.length;
          const isSubstantialContent = contentSize > 30000;

          // Strong indicators - if any match, definitely parked
          const strongParkingIndicators = [
            'sedo domain parking',
            'this domain is parked',
            'domain is parked',
            'parked by',
            'parked domain',
            'parkingcrew',
            'bodis.com',
            'hugedomains.com/domain',
            'afternic.com/forsale',
            'this domain name is for sale',
            'the domain name is for sale',
            'buy this domain name',
            'domain has expired',
            'this domain has been registered'
          ];

          // If any strong indicator matches, it's parked
          if (strongParkingIndicators.some(indicator => htmlLower.includes(indicator))) {
            result = 'parked';
            await setCachedResult(url, result, 'linkStatusCache');
            return result;
          }

          // Skip weak indicator check for substantial content (real websites)
          if (isSubstantialContent) {
            result = 'live';
            await setCachedResult(url, result, 'linkStatusCache');
            return result;
          }

          // Weak indicators - need 3+ matches on small pages
          const weakParkingIndicators = [
            'domain for sale',
            'buy this domain',
            'domain is for sale',
            'this domain may be for sale',
            'make an offer',
            'make offer',
            'expired domain',
            'register this domain',
            'purchase this domain',
            'acquire this domain',
            'coming soon',
            'under construction',
            'inquire about this domain',
            'interested in this domain',
            'domain may be for sale'
          ];

          const matchCount = weakParkingIndicators.filter(indicator =>
            htmlLower.includes(indicator)
          ).length;

          // Require 3+ weak indicators on small pages
          if (matchCount >= 3) {
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

    // Check if it's a Cloudflare-protected site
    const serverHeader = response.headers.get('server');
    const cfRay = response.headers.get('cf-ray');

    if (serverHeader?.toLowerCase().includes('cloudflare') || cfRay) {
      // Cloudflare is fronting this domain - site is configured and live
      // Even with 4xx/5xx errors, the domain is valid and accessible
      // (403 often means the site blocks direct requests but works in browser)
      console.log(`[Link Check] Cloudflare detected for ${url} (status ${response.status}), marking as live`);
      result = 'live';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }

    // 4xx errors (except 404, 410, 451) often mean the site is blocking automated requests
    // but the site itself is live and accessible in a browser
    // 403 = Forbidden (often blocks bots), 401 = Unauthorized (needs login), 405 = Method Not Allowed
    const liveButBlocking = [401, 403, 405, 406, 429];
    if (liveButBlocking.includes(response.status)) {
      console.log(`[Link Check] ${url} returned ${response.status}, likely blocking automated requests - marking as live`);
      result = 'live';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }

    // 5xx errors could be temporary server issues - try GET fallback before marking dead
    if (response.status >= 500) {
      console.log(`[Link Check] ${url} returned ${response.status}, will try GET fallback`);
      // Fall through to catch block logic by throwing
      throw new Error(`Server error ${response.status}`);
    }

    // 404 from HEAD might be a site that doesn't support HEAD - try GET fallback
    if (response.status === 404) {
      console.log(`[Link Check] ${url} returned 404 on HEAD, trying GET fallback`);
      throw new Error(`HEAD returned 404`);
    }

    // 410 (Gone), 451 (Legal) - these indicate the content is truly gone
    console.log(`[Link Check] ${url} returned ${response.status}, marking as dead`);
    result = 'dead';
    await setCachedResult(url, result, 'linkStatusCache');
    return result;

  } catch (error) {
    clearTimeout(timeoutId);

    console.log(`[Link Check] HEAD failed for ${url}:`, error.name, error.message);

    // If HEAD timed out or was aborted, mark as live (slow server, not dead)
    if (error.name === 'AbortError' || error.message?.includes('abort')) {
      console.log(`[Link Check] HEAD request timed out for ${url}, marking as live (slow server)`);
      result = 'live';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }

    // If HEAD fails for other reasons, try GET as fallback
    try {
      const fallbackController = new AbortController();
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 8000);

      const fallbackResponse = await fetch(url, {
        method: 'GET',
        signal: fallbackController.signal,
        credentials: 'omit',
        redirect: 'follow',
        headers: headers
      });
      clearTimeout(fallbackTimeout);

      // Check for Cloudflare on fallback response too
      const fbServerHeader = fallbackResponse.headers.get('server');
      const fbCfRay = fallbackResponse.headers.get('cf-ray');

      if (fbServerHeader?.toLowerCase().includes('cloudflare') || fbCfRay) {
        console.log(`[Link Check] Cloudflare detected on fallback for ${url}, marking as live`);
        result = 'live';
        await setCachedResult(url, result, 'linkStatusCache');
        return result;
      }

      // Only mark as live if GET returned a successful response
      if (fallbackResponse.ok) {
        console.log(`[Link Check] GET fallback succeeded for ${url}, marking as live`);
        result = 'live';
        await setCachedResult(url, result, 'linkStatusCache');
        return result;
      }

      // GET also returned an error - site is dead
      console.log(`[Link Check] GET fallback returned ${fallbackResponse.status} for ${url}, marking as dead`);
      result = 'dead';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    } catch (fallbackError) {
      // Check if it was a timeout (AbortError) - timeouts often mean slow server, not dead
      if (fallbackError.name === 'AbortError') {
        console.log(`[Link Check] Request timed out for ${url}, marking as live (slow server)`);
        result = 'live';
        await setCachedResult(url, result, 'linkStatusCache');
        return result;
      }

      // NetworkError usually means CORS blocked the request - site exists but blocks cross-origin
      // This is common for legitimate sites with strict security policies
      if (fallbackError.message?.includes('NetworkError') || fallbackError.name === 'TypeError') {
        console.log(`[Link Check] NetworkError for ${url}, likely CORS restriction - marking as live`);
        result = 'live';
        await setCachedResult(url, result, 'linkStatusCache');
        return result;
      }

      // Other errors (DNS errors, truly unreachable) mean the link is dead
      console.warn('Link check failed for:', url, fallbackError.message);
      result = 'dead';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }
  }
};

// Malicious URL/domain database (aggregated from multiple sources)
let maliciousUrlsSet = new Set();
let domainSourceMap = new Map(); // Track which source(s) flagged each domain
let blocklistLastUpdate = 0;
let blocklistLoading = false; // Flag to prevent duplicate loads
const BLOCKLIST_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Blocklist sources - all free, no API keys required
const BLOCKLIST_SOURCES = [
  {
    name: 'https://urlhaus.abuse.ch',
    url: 'https://urlhaus.abuse.ch/downloads/text/',
    format: 'urlhaus' // Plain text with # comments
  },
  {
    name: 'https://github.com/blocklistproject/Lists (Malware)',
    url: 'https://blocklistproject.github.io/Lists/malware.txt',
    format: 'hosts' // Hosts file format (0.0.0.0 domain.com)
  },
  {
    name: 'https://github.com/blocklistproject/Lists (Phishing)',
    url: 'https://blocklistproject.github.io/Lists/phishing.txt',
    format: 'hosts'
  },
  {
    name: 'https://github.com/blocklistproject/Lists (Scam)',
    url: 'https://blocklistproject.github.io/Lists/scam.txt',
    format: 'hosts'
  }
];

// Check URL using Google Safe Browsing API (fallback/redundancy check)
// Get a free API key at: https://developers.google.com/safe-browsing/v4/get-started
// Free tier: 10,000 requests per day
// API key is stored in browser.storage.local.googleSafeBrowsingApiKey
const checkGoogleSafeBrowsing = async (url) => {
  try {
    // Get encrypted API key from storage and decrypt it
    const apiKey = await getDecryptedApiKey('googleSafeBrowsingApiKey');

    if (!apiKey || apiKey.trim() === '') {
      console.log(`[Google SB] API key not configured, skipping`);
      return 'unknown';
    }

    console.log(`[Google SB] Checking ${url}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client: {
            clientId: 'bookmark-manager-zero',
            clientVersion: APP_VERSION
          },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }]
          }
        })
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Google SB] API error: ${response.status}`);
      return 'unknown';
    }

    const data = await response.json();

    // If matches found, URL is unsafe
    if (data.matches && data.matches.length > 0) {
      console.log(`[Google SB] ⚠️ Threat detected:`, data.matches[0].threatType);
      return 'unsafe';
    }

    console.log(`[Google SB] ✓ No threats found`);
    return 'safe';

  } catch (error) {
    console.error(`[Google SB] Error:`, error.message);
    return 'unknown';
  }
};

// Check URL using VirusTotal API
// Get a free API key at: https://www.virustotal.com/gui/my-apikey
// Free tier: 500 requests per day, 4 requests per minute
// API key is stored in browser.storage.local.virusTotalApiKey
const checkVirusTotal = async (url) => {
  try {
    // Get encrypted API key from storage and decrypt it
    const apiKey = await getDecryptedApiKey('virusTotalApiKey');

    if (!apiKey || apiKey.trim() === '') {
      console.log(`[VirusTotal] API key not configured, skipping`);
      return 'unknown';
    }

    console.log(`[VirusTotal] Checking ${url}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    // VirusTotal V3 API - URL scan
    const response = await fetch(
      `https://www.virustotal.com/api/v3/urls`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-apikey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `url=${encodeURIComponent(url)}`
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[VirusTotal] API error: ${response.status}`);
      return 'unknown';
    }

    const data = await response.json();
    const analysisId = data.data?.id;

    if (!analysisId) {
      console.error(`[VirusTotal] No analysis ID returned`);
      return 'unknown';
    }

    // Wait a moment for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get analysis results
    const analysisController = new AbortController();
    const analysisTimeout = setTimeout(() => analysisController.abort(), 10000);

    const analysisResponse = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
      {
        method: 'GET',
        signal: analysisController.signal,
        headers: {
          'x-apikey': apiKey
        }
      }
    );

    clearTimeout(analysisTimeout);

    if (!analysisResponse.ok) {
      console.error(`[VirusTotal] Analysis fetch error: ${analysisResponse.status}`);
      return 'unknown';
    }

    const analysisData = await analysisResponse.json();
    const stats = analysisData.data?.attributes?.stats;

    if (!stats) {
      console.error(`[VirusTotal] No stats in analysis results`);
      return 'unknown';
    }

    // Check if any engines detected malicious/suspicious content
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;

    console.log(`[VirusTotal] Results: ${malicious} malicious, ${suspicious} suspicious`);

    // If 2 or more engines flag as malicious, mark as unsafe
    if (malicious >= 2) {
      console.log(`[VirusTotal] ⚠️ Threat detected by ${malicious} engines`);
      return 'unsafe';
    }

    // If flagged by 1 engine or suspicious, mark as warning
    if (malicious >= 1 || suspicious >= 2) {
      console.log(`[VirusTotal] ⚠ Warning: flagged by some engines`);
      return 'warning';
    }

    console.log(`[VirusTotal] ✓ No threats found`);
    return 'safe';

  } catch (error) {
    console.error(`[VirusTotal] Error:`, error.message);
    return 'unknown';
  }
};

// Parse different blocklist formats
const parseBlocklistLine = (line, format) => {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  let domain = null;

  if (format === 'hosts') {
    // Hosts file format: "0.0.0.0 domain.com" or "127.0.0.1 domain.com"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      domain = parts[1]; // Second part is the domain
    }
  } else if (format === 'urlhaus') {
    // URLhaus format: plain URLs/domains
    domain = trimmed;
  } else {
    // Default: assume plain domain
    domain = trimmed;
  }

  if (!domain) {
    return null;
  }

  // Normalize: lowercase, remove protocol, remove trailing slash
  const normalized = domain.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  // Skip localhost and invalid entries
  if (normalized === 'localhost' || normalized.startsWith('127.') || normalized.startsWith('0.0.0.0')) {
    return null;
  }

  return normalized;
};

// Download from a single blocklist source
const downloadBlocklistSource = async (source) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    console.log(`[Blocklist] Downloading ${source.name}...`);

    const response = await fetch(source.url, {
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Blocklist] ${source.name} failed: ${response.status}`);
      return { domains: [], count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');
    const domains = [];

    for (const line of lines) {
      const normalized = parseBlocklistLine(line, source.format);
      if (normalized) {
        domains.push(normalized);
      }
    }

    console.log(`[Blocklist] ${source.name}: ${domains.length} domains loaded`);
    return { domains, count: domains.length };

  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Blocklist] ${source.name} error:`, error.message);
    return { domains: [], count: 0 };
  }
};

// Download and aggregate all blocklist sources
const updateBlocklistDatabase = async () => {
  // Prevent duplicate loads
  if (blocklistLoading) {
    console.log(`[Blocklist] Already loading, skipping duplicate request`);
    return true;
  }

  blocklistLoading = true;

  try {
    console.log(`[Blocklist] Starting update from ${BLOCKLIST_SOURCES.length} sources...`);

    // Clear existing data
    maliciousUrlsSet.clear();
    domainSourceMap.clear();

    // Download all sources in parallel for speed
    const downloadPromises = BLOCKLIST_SOURCES.map(source => downloadBlocklistSource(source));
    const results = await Promise.all(downloadPromises);

    // Combine all domains into the Set and track sources
    let totalCount = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const sourceName = BLOCKLIST_SOURCES[i].name;

      for (const domain of result.domains) {
        maliciousUrlsSet.add(domain);

        // Track which source(s) flagged this domain
        if (domainSourceMap.has(domain)) {
          // Use a Set to avoid duplicates when same domain appears multiple times in one blocklist
          const sources = domainSourceMap.get(domain);
          if (!sources.includes(sourceName)) {
            sources.push(sourceName);
          }
        } else {
          domainSourceMap.set(domain, [sourceName]);
        }
      }
      totalCount += result.count;
    }

    blocklistLastUpdate = Date.now();

    console.log(`[Blocklist] ✓ Database updated: ${maliciousUrlsSet.size} unique domains from ${totalCount} total entries`);
    console.log(`[Blocklist] Sources: URLhaus + BlockList Project (Malware, Phishing, Scam)`);

    // Store update timestamp
    await browser.storage.local.set({
      blocklistLastUpdate: blocklistLastUpdate
    });

    blocklistLoading = false;
    return true;
  } catch (error) {
    console.error(`[Blocklist] Error updating database:`, error);
    blocklistLoading = false;
    return false;
  }
};

// Check for suspicious URL patterns that aren't necessarily malicious but warrant caution
const checkSuspiciousPatterns = async (url, domain) => {
  const patterns = [];

  // 1. Check for HTTP-only (no encryption)
  if (url.toLowerCase().startsWith('http://')) {
    // Check if it redirects to HTTPS
    let redirectsToHttps = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      // Check if final URL is HTTPS
      if (response.url && response.url.toLowerCase().startsWith('https://')) {
        redirectsToHttps = true;
      }
    } catch (e) {
      // Couldn't check redirect, assume no redirect
      console.log(`[Suspicious Patterns] Could not check redirect for ${url}:`, e.message);
    }

    if (redirectsToHttps) {
      patterns.push('HTTP Only (redirects to HTTPS)');
    } else {
      patterns.push('HTTP Only (Unencrypted)');
    }
  }

  // 2. Check for known URL shorteners
  const urlShorteners = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly',
    'adf.ly', 'bl.ink', 'lnkd.in', 'short.link', 'cutt.ly', 'rebrand.ly',
    'tiny.cc', 'rb.gy', 'clck.ru', 'shorturl.at', 'v.gd'
  ];

  const domainWithoutPort = domain.split(':')[0];
  if (urlShorteners.includes(domainWithoutPort)) {
    patterns.push('URL Shortener');
  }

  // 3. Check for suspicious TLDs (commonly abused)
  const suspiciousTlds = [
    '.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.pw', '.cc', '.ws',
    '.info', '.biz', '.club', '.click', '.link', '.download', '.stream',
    '.loan', '.win', '.bid', '.trade', '.racing', '.party', '.review',
    '.science', '.work', '.date', '.faith', '.cricket', '.accountant'
  ];

  for (const tld of suspiciousTlds) {
    if (domainWithoutPort.endsWith(tld)) {
      patterns.push('Suspicious TLD');
      break;
    }
  }

  // 4. Check for IP addresses instead of domain names
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
  const ipv6Pattern = /^\[?([0-9a-f:]+)\]?(:\d+)?$/i;

  if (ipv4Pattern.test(domainWithoutPort) || ipv6Pattern.test(domainWithoutPort)) {
    patterns.push('IP Address');
  }

  return patterns;
};

// Check URL safety using aggregated blocklist database
const checkURLSafety = async (url) => {
  // Check cache first
  const cached = await getCachedResult(url, 'safetyStatusCache');
  if (cached) {
    console.log(`[Safety Check] Using cached result for ${url}:`, cached);
    // Handle both old format (string) and new format (object with sources)
    if (typeof cached === 'string') {
      return { status: cached, sources: [] };
    }
    return { status: cached.status, sources: cached.sources || [] };
  }

  console.log(`[Safety Check] Starting safety check for ${url}`);

  let result;

  try {
    // If database is currently loading, return unknown without caching
    // This prevents blocking while the startup preload completes
    if (blocklistLoading) {
      console.log(`[Blocklist] Database still loading, returning unknown (will recheck later)`);
      return { status: 'unknown', sources: [] };
    }

    // Update database if needed (once per 24 hours)
    const now = Date.now();
    if (now - blocklistLastUpdate > BLOCKLIST_UPDATE_INTERVAL) {
      console.log(`[Blocklist] Database is stale, updating...`);
      await updateBlocklistDatabase();
    }

    // If database is empty and not loading, try to load it
    if (maliciousUrlsSet.size === 0 && !blocklistLoading) {
      console.log(`[Blocklist] Database empty, loading...`);
      const success = await updateBlocklistDatabase();
      if (!success) {
        console.log(`[Blocklist] Could not load database, returning unknown`);
        const resultObj = { status: 'unknown', sources: [] };
        await setCachedResult(url, resultObj, 'safetyStatusCache');
        return resultObj;
      }
    }

    // Normalize URL for lookup (remove protocol, trailing slash, lowercase)
    const normalizedUrl = url.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    // Extract domain (hostname with port, no path)
    const domain = normalizedUrl.split('/')[0];

    console.log(`[Blocklist] Checking full URL: ${normalizedUrl}`);
    console.log(`[Blocklist] Checking domain: ${domain}`);

    // Check if full URL is in the malicious set
    if (maliciousUrlsSet.has(normalizedUrl)) {
      const sources = domainSourceMap.get(normalizedUrl) || [];
      console.log(`[Blocklist] ⚠️ Full URL found in malicious database!`);
      console.log(`[Blocklist] Detected by: ${sources.join(', ')}`);
      const resultObj = { status: 'unsafe', sources };
      console.log(`[Safety Check] Final result for ${url}: ${resultObj.status}`);
      await setCachedResult(url, resultObj, 'safetyStatusCache');
      return resultObj;
    }

    // Also check if just the domain is flagged (entire domain compromised)
    if (maliciousUrlsSet.has(domain)) {
      const sources = domainSourceMap.get(domain) || [];
      console.log(`[Blocklist] ⚠️ Domain found in malicious database!`);
      console.log(`[Blocklist] Detected by: ${sources.join(', ')}`);
      const resultObj = { status: 'unsafe', sources };
      console.log(`[Safety Check] Final result for ${url}: ${resultObj.status}`);
      await setCachedResult(url, resultObj, 'safetyStatusCache');
      return resultObj;
    }

    console.log(`[Blocklist] ✓ Neither full URL nor domain found in malicious database`);

    // Blocklists say safe - check Google Safe Browsing and VirusTotal as redundancy if API keys are configured
    const storage = await browser.storage.local.get(['googleSafeBrowsingApiKey', 'virusTotalApiKey']);
    const hasGoogleKey = storage.googleSafeBrowsingApiKey && storage.googleSafeBrowsingApiKey.trim() !== '';
    const hasVTKey = storage.virusTotalApiKey && storage.virusTotalApiKey.trim() !== '';

    // Check Google Safe Browsing
    if (hasGoogleKey) {
      console.log(`[Safety Check] Blocklists say safe, checking Google Safe Browsing as redundancy...`);
      const googleResult = await checkGoogleSafeBrowsing(url);

      if (googleResult === 'unsafe') {
        console.log(`[Safety Check] Google Safe Browsing flagged URL as unsafe!`);
        const resultObj = { status: 'unsafe', sources: ['Google Safe Browsing'] };
        await setCachedResult(url, resultObj, 'safetyStatusCache');
        return resultObj;
      }
    }

    // Check VirusTotal
    if (hasVTKey) {
      console.log(`[Safety Check] Blocklists say safe, checking VirusTotal...`);
      const vtResult = await checkVirusTotal(url);

      if (vtResult === 'unsafe') {
        console.log(`[Safety Check] VirusTotal flagged URL as unsafe!`);
        const resultObj = { status: 'unsafe', sources: ['VirusTotal'] };
        await setCachedResult(url, resultObj, 'safetyStatusCache');
        return resultObj;
      } else if (vtResult === 'warning') {
        console.log(`[Safety Check] VirusTotal flagged URL as suspicious!`);
        const resultObj = { status: 'warning', sources: ['VirusTotal'] };
        await setCachedResult(url, resultObj, 'safetyStatusCache');
        return resultObj;
      }
    }

    // Not malicious, but check for suspicious patterns
    const suspiciousPatterns = await checkSuspiciousPatterns(url, domain);
    if (suspiciousPatterns.length > 0) {
      console.log(`[Safety Check] Suspicious patterns detected: ${suspiciousPatterns.join(', ')}`);
      const resultObj = { status: 'warning', sources: suspiciousPatterns };
      await setCachedResult(url, resultObj, 'safetyStatusCache');
      return resultObj;
    }

    // Both checks passed (or Google SB not configured) and no suspicious patterns
    const resultObj = { status: 'safe', sources: [] };
    console.log(`[Safety Check] Final result for ${url}: ${resultObj.status}`);
    await setCachedResult(url, resultObj, 'safetyStatusCache');
    return resultObj;

  } catch (error) {
    console.error(`[Blocklist] Error checking URL safety:`, error);
    const resultObj = { status: 'unknown', sources: [] };
    await setCachedResult(url, resultObj, 'safetyStatusCache');
    return resultObj;
  }
};

// Listen for messages from the frontend
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkLinkStatus") {
    // Validate URL before checking
    const safeUrl = sanitizeUrl(request.url);
    if (!safeUrl) {
      sendResponse({ status: 'dead' });
      return true;
    }

    checkLinkStatus(safeUrl).then(status => {
      sendResponse({ status });
    });
    return true; // Required to indicate an asynchronous response.
  }

  if (request.action === "checkURLSafety") {
    // Validate URL before checking
    const safeUrl = sanitizeUrl(request.url);
    if (!safeUrl) {
      sendResponse({ status: 'unsafe', sources: ['Invalid URL'] });
      return true;
    }

    checkURLSafety(safeUrl).then(result => {
      // Handle both old cache format (string) and new format (object)
      if (typeof result === 'string') {
        sendResponse({ status: result, sources: [] });
      } else {
        sendResponse({ status: result.status, sources: result.sources || [] });
      }
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

// Preload blocklist database on extension startup
// This ensures the database is ready when the sidebar opens
(async () => {
  console.log('[Startup] Preloading blocklist database...');
  const startTime = Date.now();

  try {
    await updateBlocklistDatabase();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Startup] Blocklist database loaded in ${elapsed}s with ${maliciousUrlsSet.size} entries`);
  } catch (error) {
    console.error('[Startup] Failed to preload blocklist database:', error);
  }
})();
