# Changelog

All notable changes to Bookmark Manager Zero will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1] - 2025-01-17 (Beta Release)

### Added
- **Core Bookmark Management**
  - Create, read, update, and delete bookmarks
  - Full integration with Firefox native bookmark API
  - Bidirectional sync between extension and Firefox bookmarks
    - Syncs title, URL, and folder structure
    - Note: Firefox API does not support tags or keywords
  - Real-time bookmark event listeners with debouncing

- **Folder Management**
  - Create, rename, and delete folders
  - Hierarchical folder structure
  - Drag and drop reorganization
  - Protected system folders (cannot delete Bookmarks Toolbar, Menu, etc.)

- **Search and Filter**
  - Real-time search with instant results
  - Search across bookmark titles and URLs
  - Clear search functionality

- **Duplicate Detection** (NEW)
  - Scan all bookmarks for duplicates
  - Display duplicates grouped by URL
  - Show folder paths for each duplicate
  - Selective batch deletion with checkboxes
  - Two-tier safety warnings:
    - Standard deletion confirmation
    - ALL CAPS warning when deleting all copies of a URL

- **Safety Features**
  - Duplicate bookmark warning when creating bookmarks
  - Protected Firefox built-in folders from deletion
  - Enhanced delete confirmations with item counts
  - Safeguard against deleting all copies of duplicate bookmarks
  - **Undo deletion with 5-second countdown** (NEW)
    - Toast notification appears after deletion
    - Visual countdown timer (5 seconds)
    - Click "Undo" to restore deleted bookmarks/folders
    - Recursively restores folders with all children
    - Works in both extension and preview modes
  - Export/backup to JSON format

- **Context Menu Actions**
  - Open bookmark in new tab
  - Edit bookmark details
  - Delete bookmark
  - Check link validity and security (VirusTotal integration)
  - Open with Textise (text-only view)
  - Save page as PDF

- **Advanced Features**
  - Link checking with VirusTotal security scanning
  - Export all bookmarks to JSON
  - Text-only page view via Textise integration
  - PDF save functionality with browser print dialog

- **User Interface**
  - Material Design SVG icons throughout
  - Dark theme with modern styling
  - Smooth animations and transitions
  - Responsive layout
  - Keyboard shortcut (Ctrl+Shift+B) to toggle sidebar
  - Version badge display (Beta v0.1)
  - Undo toast notification with countdown timer
  - Slide-up animation for toast appearance

- **Preview Mode**
  - Mock data for testing without Firefox API
  - Full feature testing in browser preview
  - Cache busting for development

### Technical
- Manifest V3 compliant
- Vanilla JavaScript (no framework dependencies)
- Event-driven architecture
- Debounced sync operations (100ms)
- Comprehensive console logging for debugging
- Recursive tree traversal for bookmark operations

### Permissions
- `bookmarks` - Bookmark management
- `storage` - Settings persistence
- `tabs` - Tab operations and PDF save
- `<all_urls>` - Link checking functionality

### Known Issues
- Large bookmark collections (1000+) may experience performance impacts
- Preview mode has limitations compared to full extension
- Link checking requires active internet connection and VirusTotal API availability
- VirusTotal and Textise integrations depend on third-party service availability
- Firefox bookmark API does not support tags or keywords (limitation of the browser API, not the extension)

### Browser Support
- Firefox 109 or later
- Not compatible with Chrome/Edge (uses Firefox-specific APIs)

---

## Future Releases

### Planned for v0.2
- Import bookmarks from JSON
- Sort bookmarks by date, name, or custom order
- Improved performance for large collections

### Planned for v1.0
- Submit to Firefox Add-ons
- Complete accessibility audit
- Internationalization (i18n)
- Tag support
- Bookmark notes/descriptions
- Firefox Sync integration
- Keyboard shortcuts for all actions

---

**Legend:**
- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements
