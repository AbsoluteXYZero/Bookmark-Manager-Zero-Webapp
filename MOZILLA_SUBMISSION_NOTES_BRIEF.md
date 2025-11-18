BOOKMARK MANAGER ZERO v1.3.0 - Submission Notes
Repository: https://github.com/AbsoluteXYZero/Bookmark-Manager-Zero

## PERMISSIONS

bookmarks - Core functionality: read/write Firefox bookmarks (getTree, create, update, remove, move)
storage - Store preferences locally (theme, view, zoom, cache, encrypted API keys). Local only, no cloud sync
tabs - Open bookmarks in new tabs (tabs.create)
<all_urls> - Check bookmark availability via HEAD requests. Only status codes checked, no content. Disableable. Cached

## EXTERNAL APIS

Default (disableable):
• WordPress mshots - Screenshot previews
• URLhaus - Malware database
• BlockList Project - Malicious domains
• Google Favicons - Site icons

Opt-in (user API keys required):
• Google Safe Browsing - Threat intel
• VirusTotal - Manual scanning

Full disclosure in PRIVACY.md

## SECURITY

CSP: script-src 'self', no eval, no remote code
Encryption: AES-256-GCM for API keys
Validation: URL sanitization, XSS protection
Private: Memory-only in incognito, no disk writes

## CODE

Pure vanilla JS - no obfuscation, minification, or bundlers
No remote code - all in package, no dynamic loading
Files: sidebar.js (4500+ lines), background.js, sidebar.html

## PRIVACY

✓ No analytics/tracking
✓ No third-party data collection
✓ Offline capable
✓ GDPR/CCPA compliant
✓ User control over external features
✓ Open source (MIT)

## ACCESSIBILITY

✓ ARIA labels
✓ Keyboard nav
✓ Screen reader compatible
✓ Focus management

## TESTING

Works with existing Firefox bookmarks - no accounts needed.
Free API keys (optional):
- Safe Browsing: https://developers.google.com/safe-browsing/v4/get-started
- VirusTotal: https://www.virustotal.com/gui/my-apikey

## VERSIONS

v1.3.0 - Multiple filter selection, Buy Me a Coffee support
v1.2.0 - HTML/JSON export, code cleanup
v1.1.0 - Fixed link checking, status indicators
v1.0.0 - Stable: private browsing, export, accessibility

## LIMITATIONS

Firefox only (Firefox bookmark API)
Sidebar only
No Firefox Sync (use native sync)

Contact: https://github.com/AbsoluteXYZero/Bookmark-Manager-Zero/issues
