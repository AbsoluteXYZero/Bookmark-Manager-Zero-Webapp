# Mozilla Add-ons Submission Notes

**Extension Name:** Bookmark Manager Zero
**Version:** 1.1.0
**Developer:** AbsoluteXYZero
**Repository:** https://github.com/AbsoluteXYZero/Bookmark-Manager-Zero

---

## For Mozilla Reviewers

This document provides information to help expedite the review process.

## Permission Justifications

### `bookmarks` Permission
**Why needed:** Core functionality - the extension is a bookmark manager that reads and modifies the user's Firefox bookmarks.

**Usage:**
- `browser.bookmarks.getTree()` - Load bookmark hierarchy (sidebar.js:664)
- `browser.bookmarks.create()` - Create new bookmarks (sidebar.js:2059)
- `browser.bookmarks.update()` - Edit bookmark titles/URLs (sidebar.js:2139)
- `browser.bookmarks.remove()` - Delete bookmarks (sidebar.js:1892)
- `browser.bookmarks.move()` - Reorganize bookmarks (sidebar.js:2239)
- Event listeners for real-time sync (sidebar.js:3303-3321)

### `storage` Permission
**Why needed:** Store user preferences and cache data locally.

**Usage:**
- Theme preferences (sidebar.js:532, 552)
- View mode settings (sidebar.js:564, 586)
- Zoom level (sidebar.js:598, 644)
- Link status cache (to avoid repeated HTTP checks)
- Safety status cache (to avoid API rate limits)
- Encrypted API keys (sidebar.js:299, 306)
- Whitelist and safety history (sidebar.js:2498, 2524)

**Privacy:** All data stored locally using `browser.storage.local`. No cloud sync.

### `tabs` Permission
**Why needed:** Open bookmarks in new tabs when user clicks them.

**Usage:**
- `browser.tabs.create()` - Open bookmark URLs (sidebar.js:1864)
- Context menu "Open in New Tab" action

### `<all_urls>` Host Permission
**Why needed:** Check if bookmark links are still working (link availability checking).

**Usage:**
- Send HEAD requests to bookmark URLs to verify they're not dead (404/500 errors)
- Only HTTP status codes are checked - no page content is accessed
- Feature can be **completely disabled** in settings
- See `checkLinkStatus()` function in background.js

**Privacy Notes:**
- Only HEAD requests (minimal data transfer)
- No cookies sent
- No authentication
- Can be disabled by user
- Results cached to minimize requests

## External API Calls

All external services are documented in PRIVACY.md. Summary:

### Always Used (unless disabled in settings):
1. **WordPress mshots** (`s0.wp.com`) - Screenshot generation
   - Sends: Bookmark URLs
   - Purpose: Generate preview thumbnails
   - CSP: Allowed via `connect-src https:` in manifest.json:57

2. **URLhaus** (`urlhaus.abuse.ch`) - Malware database
   - Sends: Bookmark URLs
   - Purpose: Check for known malware/phishing
   - CSP: Allowed via `connect-src https:` in manifest.json:57

3. **BlockList Project** (`blocklistproject.github.io`) - Domain blocklist
   - Sends: Domain names
   - Purpose: Check against known malicious domains
   - CSP: Allowed via `connect-src https:` in manifest.json:57

4. **Google Favicons** (`www.google.com/s2/favicons`) - Favicon service
   - Sends: Domain names
   - Purpose: Display website icons
   - CSP: Implicitly allowed via `https:`

### Opt-in Only (require user-provided API keys):
5. **Google Safe Browsing** (`safebrowsing.googleapis.com`) - Optional
   - Requires manual API key setup
   - User must explicitly request and configure
   - CSP: Allowed via `connect-src https:` in manifest.json:57

6. **VirusTotal** (`www.virustotal.com`) - Optional
   - Requires manual API key setup
   - Only used when user explicitly clicks "Check on VirusTotal"
   - CSP: Allowed via `connect-src https:` in manifest.json:57

### Manual Action Only:
7. **Textise** (`www.textise.net`) - Optional
   - Only when user clicks "View Text-Only" on a bookmark
   - Opens in new tab (not programmatic access)

## Security Measures

### Content Security Policy
Strong CSP defined in manifest.json:56-58:
- `script-src 'self'` - No external scripts
- `object-src 'none'` - No plugins
- `form-action 'none'` - No form submissions
- `frame-ancestors 'none'` - No embedding
- `connect-src 'self' https: http:` - Allows link checking for bookmark URLs

### API Key Encryption
API keys (Google Safe Browsing, VirusTotal) are encrypted before storage:
- Algorithm: AES-256-GCM (sidebar.js:263-291)
- Key derivation from browser fingerprint
- Never stored in plain text
- Private browsing: keys only in memory

### Input Validation
- URL validation before processing (url-validator.js)
- XSS protection on bookmark titles/URLs
- Sanitization of user inputs

### Private Browsing Support
- Memory-only storage in incognito mode (sidebar.js:147-188)
- No disk writes in private windows
- Session data cleared on window close

## Source Code Review Notes

### Main Files
- **sidebar.js** (4500+ lines) - Core extension logic with inline encryption and validation
- **background.js** - Service worker for link checking and security scanning
- **sidebar.html** - UI markup
- **icons/** - Extension icons (4 SVG files)

### No Obfuscation
- Pure vanilla JavaScript
- No minification
- No bundlers or transpilers
- Fully readable source code

### No Remote Code
- All code included in extension package
- No dynamic script loading
- No eval() or Function() constructor
- No external script dependencies

## Testing Notes

### Test Accounts Not Required
Extension works with user's existing Firefox bookmarks. No external accounts needed for basic functionality.

### Optional API Keys for Full Testing
To test optional features, reviewers can obtain free API keys:
- **Google Safe Browsing:** https://developers.google.com/safe-browsing/v4/get-started
- **VirusTotal:** https://www.virustotal.com/gui/my-apikey

Both have generous free tiers suitable for testing.

## Privacy Compliance

- ✅ PRIVACY.md included with full disclosure
- ✅ No data collection or analytics
- ✅ No third-party tracking
- ✅ All external services documented
- ✅ User control over all external features
- ✅ Works fully offline when external features disabled
- ✅ GDPR/CCPA compliant (local storage only)

## Accessibility

- ✅ Comprehensive ARIA labels (sidebar.js:c5c065f)
- ✅ Keyboard navigation support
- ✅ Focus traps for modals
- ✅ Screen reader compatible
- ✅ High contrast theme support

## Open Source

- ✅ MIT License
- ✅ Public GitHub repository
- ✅ Full source code available
- ✅ Community contributions welcome

## Known Limitations

1. **Firefox Only** - Uses Firefox-specific bookmark API, not compatible with Chrome
2. **Sidebar Only** - Designed as sidebar extension, not popup
3. **No Sync** - Does not integrate with Firefox Sync (users can use native sync)

## Version History

- **v1.1.0** - Bug fixes & improvements: Fixed link checking (CSP updated), fixed status indicators persisting after operations, fixed preview image restoration, auto-add https:// protocol, updated icons (transparent background), corrected documentation
- **v1.0.0** - Stable release: private browsing, error handling, export, accessibility, complete documentation, bug fixes
- **v0.7.0** - Development release with private browsing and error handling
- **v0.6.x** - Multi-select, keyboard navigation, security features
- **v0.5.x** - Initial release with core bookmark management

## Contact

For review questions or clarifications:
- **GitHub Issues:** https://github.com/AbsoluteXYZero/Bookmark-Manager-Zero/issues
- **Developer:** AbsoluteXYZero

## Review Checklist

For reviewer convenience:

- [ ] Permissions justified and minimal
- [ ] External API calls documented in PRIVACY.md
- [ ] CSP properly configured
- [ ] No obfuscated code
- [ ] No remote code execution
- [ ] User privacy respected
- [ ] Open source (MIT License)
- [ ] Security best practices followed
- [ ] Accessibility features implemented
- [ ] Works in private browsing mode

## Additional Notes

**Why "Zero" in the name?**
"Zero" represents zero bloat, zero tracking, and zero compromise on privacy - a lightweight, privacy-focused bookmark manager.

**Development Philosophy:**
Built with vanilla JavaScript for transparency and simplicity. No frameworks, no build process, no hidden dependencies. What you see in the source is exactly what runs.

Thank you for reviewing Bookmark Manager Zero! 🙏
