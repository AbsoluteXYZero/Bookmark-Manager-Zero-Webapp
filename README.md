# Bookmark Manager Zero

**A modern, privacy-focused interface for managing your Firefox bookmarks.**

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Firefox](https://img.shields.io/badge/firefox-compatible-orange)

## Overview

Bookmark Manager Zero is a Firefox extension that provides a beautiful, feature-rich sidebar interface for managing your native Firefox bookmarks. It enhances your bookmark management experience with modern UI, advanced search, safety checking, and intelligent organization tools.

## Features

### Core Functionality
- ✅ **Native Bookmark Integration** - Works directly with Firefox's bookmark system
- ✅ **Modern Material Design UI** - Clean, intuitive interface with multiple themes
- ✅ **Sidebar Interface** - Quick access via `Ctrl+Shift+B`
- ✅ **Real-time Sync** - Instantly reflects bookmark changes made in Firefox

### Organization & Search
- 🔍 **Advanced Search** - Real-time search across titles and URLs
- 📁 **Folder Management** - Create, edit, move, and organize folders
- 🏷️ **Smart Filters** - Filter by dead links, unsafe URLs, duplicates
- 📊 **List & Grid Views** - Choose your preferred layout
- 🔄 **Drag & Drop** - Reorder bookmarks and folders (coming soon)

### Link & Safety Checking
- 🔗 **Link Status Checking** - Automatically detects broken/dead links
- 🛡️ **Security Scanning** - Checks URLs against malware databases
- ⚠️ **Safety Indicators** - Visual warnings for suspicious links
- ✅ **Whitelist Support** - Mark trusted URLs to skip safety checks
- 📜 **Safety History** - Track status changes over time

### Privacy & Security
- 🔒 **Private Browsing Support** - Respects incognito mode with memory-only storage
- 🔐 **Encrypted API Keys** - AES-256-GCM encryption for stored credentials
- 🚫 **No Tracking** - Zero analytics, no data collection
- 🌐 **Offline Mode** - Works fully offline when external features disabled
- 🗑️ **Auto-Clear Cache** - Configurable automatic cache cleanup

### User Experience
- 🎨 **3 Themes** - Blue Dark (default), Light, Dark
- ⌨️ **Keyboard Navigation** - Full keyboard support with arrow keys
- ♿ **Accessibility** - Comprehensive ARIA labels and keyboard traps
- 🔍 **Zoom Control** - 50% - 200% zoom levels
- 📱 **Responsive Design** - Adapts to sidebar width

### Advanced Features
- 🖼️ **Website Previews** - Screenshot thumbnails of bookmarks
- 📝 **Text-Only View** - View bookmark pages in text-only mode
- 🔄 **Bulk Operations** - Multi-select mode for batch editing/deletion
- 📋 **Duplicate Detection** - Find and manage duplicate bookmarks
- ⏮️ **Undo System** - Restore recently deleted bookmarks
- 🌍 **Favicon Display** - Show website icons

## Installation

### From Mozilla Add-ons (Recommended)
Coming soon - awaiting Mozilla review

### Manual Installation (Developer Mode)
1. Clone this repository:
   ```bash
   git clone https://github.com/AbsoluteXYZero/Bookmark-Manager-Zero.git
   ```
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select `manifest.json` from the cloned directory

## Usage

### Basic Usage
1. Open the sidebar: Press `Ctrl+Shift+B` or click the toolbar icon
2. Browse your bookmarks in the organized folder structure
3. Click any bookmark to open it in a new tab
4. Use the search bar to find specific bookmarks

### Managing Bookmarks
- **Add Bookmark:** Click the "+" button in the header
- **Edit Bookmark:** Right-click → Edit
- **Delete Bookmark:** Right-click → Delete (with undo support)
- **Move Bookmark:** Drag and drop to a different folder
- **Create Folder:** Click the folder icon in the header

### Search & Filter
- **Search:** Type in the search bar to filter by title/URL
- **Filter by Status:** Click the filter icon to show:
  - Dead Links (404 errors)
  - Unsafe URLs (flagged by security services)
  - Duplicates (same URL multiple times)

### Multi-Select Mode
1. Click the grid icon to enable multi-select
2. Click checkboxes on bookmarks/folders
3. Use "Delete Selected" to remove multiple items at once

### Settings
Click the gear icon to access:
- **Display Options:** Toggle title, URL, status indicators, previews
- **View Mode:** Switch between list and grid layouts
- **Theme:** Choose from 3 themes
- **Zoom:** Adjust interface size
- **Cache Management:** Configure auto-clear settings
- **API Keys:** Set up optional security API keys

### Keyboard Shortcuts

#### Global
- `Ctrl+Shift+B` - Toggle sidebar
- `Ctrl+F` or `/` - Focus search

#### Navigation (when item selected)
- `↑/↓` - Navigate bookmarks
- `←/→` - Collapse/expand folders or show/hide previews
- `Enter` - Open bookmark or toggle folder
- `Escape` - Clear selection

## Privacy

Bookmark Manager Zero respects your privacy:

- **All data stored locally** on your device
- **No tracking or analytics**
- **No advertisements**
- **Open source** - audit the code yourself
- **Private browsing support** - memory-only storage in incognito mode

See [PRIVACY.md](PRIVACY.md) for complete privacy policy.

## External Services (Optional)

The extension can optionally use external services for enhanced features. **All can be disabled in settings:**

### Default Services (can be disabled)
- **WordPress mshots** - Website screenshot previews
- **URLhaus** - Malware URL database
- **BlockList Project** - Known malicious domains
- **Google Favicons** - Website icons

### User-Configured Services (require API keys)
- **Google Safe Browsing** - Additional malware protection
- **VirusTotal** - Comprehensive threat scanning

All external service usage is disclosed in [PRIVACY.md](PRIVACY.md).

## Permissions

### Required Permissions
- `bookmarks` - Read and manage your Firefox bookmarks
- `storage` - Save preferences and cache locally
- `tabs` - Open bookmarks in tabs

### Optional Permissions
- `<all_urls>` - Check if bookmark links are still working
  - Only sends HEAD requests (no content accessed)
  - Can be fully disabled in settings

## Development

### Project Structure
```
├── manifest.json          # Extension manifest
├── sidebar.html          # Main UI
├── sidebar.js            # Core logic (3300+ lines)
├── background.js         # Background service worker
├── crypto-utils.js       # Encryption utilities
├── url-validator.js      # URL validation
├── icons/                # Extension icons
└── PRIVACY.md           # Privacy policy
```

### Key Technologies
- Vanilla JavaScript (no frameworks)
- Material Design 3 color system
- Firefox WebExtensions API
- AES-256-GCM encryption for API keys
- CSS Grid & Flexbox

### Building
No build process required - pure vanilla JavaScript.

## Security

### Security Features
- ✅ Strong Content Security Policy (CSP)
- ✅ AES-256-GCM encryption for stored API keys
- ✅ No eval() or inline scripts
- ✅ HTTPS-only external requests
- ✅ Input validation and sanitization
- ✅ XSS protection

### Reporting Security Issues
Please report security vulnerabilities via GitHub Issues (mark as security issue).

## Browser Compatibility

- **Firefox:** ✅ Fully supported (Manifest V3)
- **Chrome/Edge:** ❌ Not compatible (Firefox-specific APIs)

## Roadmap

Potential future features:
- [ ] Import/export bookmarks (JSON, HTML)
- [ ] Bookmark tags
- [ ] Custom sorting options
- [ ] Bookmark notes/descriptions
- [ ] Bookmark statistics/analytics
- [ ] Sync across devices (Firefox Sync integration)

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Changelog

### v1.1.0 (Current) - Bug Fixes & Improvements

**Critical Fixes:**
- 🔧 **Fixed link checking feature** - Content Security Policy updated to allow URL checking for all bookmark URLs (previously blocked by overly restrictive CSP)
- 🔧 **Fixed status indicators persisting** - Link and safety check results no longer reset to grey after bookmark operations (add/edit/delete)
- 🔧 **Fixed preview images not restoring** - Preview thumbnails now properly restore after status checks complete

**Improvements:**
- ✨ **Auto-add https:// protocol** - Bookmarks can now be saved without typing protocol (e.g., "google.com" → "https://google.com")
- 🎨 **Updated extension icons** - Removed black background square, cleaner transparent design with black-filled shield
- 📝 **Corrected documentation** - Fixed theme count (3 themes, not 8) in README and release notes

**Technical Details:**
- CSP `connect-src` changed from specific domains to `https: http:` to enable link checking
- Status data now preserved across `loadBookmarks()` calls using Map-based caching
- Preview tracking key changed from `bookmark.id` to `bookmark.url` for consistency
- Protocol detection regex: `^[a-zA-Z][a-zA-Z0-9+.-]*:` handles all valid URL schemes

### v1.0.0 - Stable Release
- **Private browsing support** with memory-only storage
- **Global error boundary** with comprehensive logging
- **Export bookmarks** as JSON backup
- **Cache management** with size display and auto-clear
- **Enhanced keyboard navigation** with arrow keys
- **Multi-select mode** with bulk operations
- **Accessibility improvements** (ARIA labels, focus traps, keyboard traps)
- **Security enhancements** (AES-256-GCM encryption, CSP, input validation)
- **Complete documentation** for Mozilla Add-ons submission
- **Bug fixes** including DoH toggle removal and export feature repair
- No longer in beta - production ready!

### Previous Versions
- **v0.7.0** - Development release with private browsing and error handling
- See commit history for detailed changes

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/AbsoluteXYZero/Bookmark-Manager-Zero/issues)
- **Source Code:** [GitHub Repository](https://github.com/AbsoluteXYZero/Bookmark-Manager-Zero)

## Acknowledgments

- Material Design 3 color system by Google
- URLhaus by abuse.ch
- BlockList Project community
- Firefox WebExtensions team

---

**Made with ❤️ for Firefox users who love organized bookmarks**
