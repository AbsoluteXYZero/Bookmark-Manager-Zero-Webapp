const fs = require('fs');
const path = 'C:/Users/Zero/AppData/Local/Temp/Bookmark-Manager-Zero/background.js';
let content = fs.readFileSync(path, 'utf8');

// First replacement: parking indicators
const oldParking = `          // Check for parking page indicators
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
          }`;

const newParking = `          // Real websites typically have substantial content
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
          }`;

content = content.replace(oldParking, newParking);

// Second replacement: add Cloudflare check before dead
const oldDead = `    // 4xx or 5xx error means the link is dead
    result = 'dead';
    await setCachedResult(url, result, 'linkStatusCache');
    return result;`;

const newDead = `    // Check if it's a Cloudflare-protected site with origin issues
    const serverHeader = response.headers.get('server');
    const cfRay = response.headers.get('cf-ray');

    if (serverHeader?.toLowerCase().includes('cloudflare') || cfRay) {
      // Cloudflare is fronting this domain - site is configured and live
      // Even if origin has issues (520-527), the domain is valid
      console.log(\`[Link Check] Cloudflare detected for \${url} (status \${response.status}), marking as live\`);
      result = 'live';
      await setCachedResult(url, result, 'linkStatusCache');
      return result;
    }

    // 4xx or 5xx error means the link is dead
    result = 'dead';
    await setCachedResult(url, result, 'linkStatusCache');
    return result;`;

content = content.replace(oldDead, newDead);

fs.writeFileSync(path, content);
console.log('File updated successfully');
