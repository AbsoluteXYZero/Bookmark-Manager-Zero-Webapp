# Bookmark Manager Zero

A modern, feature-rich interface for managing Firefox bookmarks with enhanced safety features and intuitive controls.

**Current Version:** Beta v0.1

## Features

### Core Functionality
- **Full Bookmark Management** - Create, read, update, and delete bookmarks directly from Firefox's native bookmark API
- **Drag & Drop** - Reorganize bookmarks by dragging them between folders
- **Real-time Search** - Instantly find bookmarks as you type
- **Bidirectional Sync** - Changes in the extension immediately reflect in Firefox, and vice versa
  - Syncs title, URL, and folder structure
  - Note: Firefox API does not currently support syncing tags or keywords
- **Folder Management** - Create, rename, delete, and organize folders with ease

### Advanced Features
- **Duplicate Detection** - Scan all bookmarks and identify duplicates across folders
  - Shows folder paths for each duplicate
  - Selective batch deletion with checkboxes
  - Safety warning when deleting all copies of a URL
- **Link Checking** - Verify if bookmarks are still accessible and scan for security threats using VirusTotal
- **Export/Backup** - Save all bookmarks to JSON format for backup
- **Text-Only View** - Open bookmarks with Textise for clean, ad-free reading
- **Save as PDF** - Quick access to save pages as PDF

### Safety Features
- **Protected Folders** - Cannot delete Firefox built-in folders (Bookmarks Toolbar, Bookmarks Menu, etc.)
- **Duplicate Warning** - Alerts when creating a bookmark that already exists
- **Enhanced Delete Confirmation** - Shows item counts before deletion
- **Two-Tier Deletion Warnings** - Extra warning when deleting all copies of duplicate bookmarks
- **Undo Deletion** - 5-second window to undo bookmark/folder deletions with countdown timer

### User Experience
- **Material Design Icons** - Clean, modern SVG icons throughout
- **Dark Theme** - Easy on the eyes with a sleek dark interface
- **Keyboard Shortcuts** - Ctrl+Shift+B to open/close sidebar
- **Responsive UI** - Smooth animations and transitions

## Installation

### For Beta Testers

1. **Download the Extension**
   - Clone or download this repository
   - Or download the latest release from the [Releases](../../releases) page

2. **Install in Firefox**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Navigate to the extension folder and select `manifest.json`
   - The extension will appear in your sidebar

3. **Access the Extension**
   - Press `Ctrl+Shift+B` to open the sidebar
   - Or click the Bookmark Manager Zero icon in your toolbar

### For Production (Coming Soon)
The extension will be available on Firefox Add-ons once it exits beta.

## Usage Guide

### Basic Operations

**Create a Bookmark**
1. Click the "Add Bookmark" button
2. Enter the URL and title
3. Select a parent folder (optional)
4. Click "Add"

**Create a Folder**
1. Click the "Add Folder" button
2. Enter the folder name
3. Select a parent folder (optional)
4. Click "Create"

**Search Bookmarks**
- Simply type in the search box at the top
- Results filter in real-time

**Reorganize with Drag & Drop**
- Click and hold any bookmark or folder
- Drag to a new location
- Drop to move it

### Advanced Features

**Find Duplicate Bookmarks**
1. Click the "Find Duplicates" button (clipboard icon)
2. Review the list of duplicates with their folder paths
3. Check the boxes next to duplicates you want to delete
4. Click "Delete Selected"
5. Confirm the warnings

**Export Bookmarks**
1. Click the Settings gear icon
2. Click "Export Bookmarks"
3. Save the JSON file to your computer

**Context Menu Options**
- Right-click any bookmark to:
  - Open in new tab
  - Edit bookmark details
  - Delete bookmark
  - Check if link is valid
  - Open with Textise (text-only view)
  - Save page as PDF

## Beta Testing

### What We're Looking For
- Bug reports (crashes, unexpected behavior)
- Performance issues (especially with large bookmark collections)
- UI/UX feedback
- Feature requests

### How to Report Issues
1. Go to the [Issues](../../issues) page
2. Click "New Issue"
3. Use the bug report or feature request template
4. Provide as much detail as possible

### Known Limitations
- Preview mode uses mock data and has limited functionality
- Link checking requires internet connection
- Textise integration requires third-party service
- Large collections (1000+ bookmarks) may have performance impacts
- Firefox bookmark API limitations:
  - Tags and keywords are not currently supported for bidirectional sync
  - Only title, URL, and folder structure sync between extension and Firefox

## Technical Details

### Built With
- **Firefox WebExtension API** - Native bookmark manipulation
- **Material Design** - Modern UI components
- **Vanilla JavaScript** - No framework dependencies
- **Manifest V3** - Latest extension standard

### Permissions
- `bookmarks` - Read and modify bookmarks
- `storage` - Save extension settings
- `tabs` - Open links and manage tabs
- `<all_urls>` - Link checking and PDF save functionality

### Browser Compatibility
- Firefox 109 or later
- Not compatible with Chrome/Edge (uses Firefox-specific APIs)

## Privacy

This extension:
- **Does NOT** send your bookmarks to any server
- **Does NOT** track your browsing history
- **Does NOT** collect personal data
- Only uses third-party services when you explicitly request them:
  - **VirusTotal** - When checking link security (requires user action)
  - **Textise** - When opening text-only view (requires user action)
- All bookmark data stays local to your Firefox profile

## Development

### Project Structure
```
Bookmark-Manager-Zero-Webapp/
├── manifest.json       # Extension configuration
├── sidebar.html        # Main UI
├── sidebar.js          # Core functionality
├── background.js       # Background processes
├── icons/              # Extension icons
└── reader.tsx          # Reader view component
```

### Local Development
1. Make changes to source files
2. Reload the extension in `about:debugging`
3. Test thoroughly before committing

## Roadmap

### Planned Features
- [ ] Import bookmarks from JSON
- [x] Undo last deletion
- [ ] Sort bookmarks by date/name
- [ ] Keyboard shortcuts for common actions
- [ ] Tag support
- [ ] Bookmark notes/descriptions
- [ ] Firefox Sync integration

### Post-Beta Goals
- Submit to Firefox Add-ons
- Performance optimization for large collections
- Accessibility improvements
- Internationalization (i18n)

## Support

### Getting Help
- Check the [Issues](../../issues) page for existing questions
- Create a new issue with the "question" label
- Review the documentation in this README

### Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is open source. License details to be determined.

## Acknowledgments

- **VirusTotal** - URL security scanning and threat detection API
- **Textise.net** - Text-only view and ad-free reading functionality
- **Material Design** - Modern icon system from Google
- **Readability** - Mozilla's article extraction library
- **Firefox WebExtension API** - Comprehensive documentation and support

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

**Current Status:** Beta v0.1 - Active testing phase

**Last Updated:** 2025-01-17
