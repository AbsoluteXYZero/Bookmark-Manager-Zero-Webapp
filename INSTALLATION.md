# Bookmark Manager Zero - Installation & Testing Guide

## 🎯 Quick Start

Your Firefox sidebar extension is ready to test! Here's how to install and use it.

## 📋 Prerequisites

- Firefox Browser (latest version recommended)
- Icon files (optional, see step 1)

## 🚀 Installation Steps

### Step 1: Generate Icons (Required)

The extension needs two icon files. Choose one method:

#### Option A: Use the HTML Generator (Easiest)
1. Open `icons/GENERATE_ICONS.html` in your web browser
2. Click "Download 48x48" and save as `bookmark-48.png` in the `icons/` folder
3. Click "Download 96x96" and save as `bookmark-96.png` in the `icons/` folder

#### Option B: Use Any Icon Tool
- Create 48x48 and 96x96 PNG files
- Name them `bookmark-48.png` and `bookmark-96.png`
- Place in the `icons/` folder
- See `icons/README.md` for more options

### Step 2: Load Extension in Firefox

1. Open Firefox
2. Type `about:debugging` in the address bar and press Enter
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to your project folder
6. Select the `manifest.json` file
7. Click "Open"

✅ The extension is now loaded!

### Step 3: Open the Sidebar

Choose one method:
- **Keyboard**: Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac)
- **Menu**: View → Sidebar → Bookmark Manager Zero
- **Icon**: Click the Firefox sidebar icon, then select Bookmark Manager Zero

## 🎨 Features to Test

### Basic Features
- ✅ Browse your bookmarks in a hierarchical tree
- ✅ Click folders to expand/collapse them
- ✅ Click bookmarks to open them
- ✅ Search bookmarks using the search bar
- ✅ Toggle theme (light/dark) using the sun/moon icon

### Bookmark Management
- ✅ Click the ➕ button to create a new bookmark
- ✅ Click the 📁 button to create a new folder
- ✅ Click the ⋮ menu on any bookmark to:
  - Open in new tab
  - Edit bookmark
  - Delete bookmark

### Settings
- ✅ Click the ⚙️ (settings) icon
- ✅ Click "Switch Sidebar Side" to change position
  - Note: Firefox will show instructions to manually move the sidebar

### Filters (Coming Soon)
- ✅ Click the ≡ filter icon to show filter options
- 🚧 Live/Dead link detection (planned)
- 🚧 Safety scanning (planned)

## 🔧 Known Limitations

1. **Icons**: If you skip creating icons, Firefox may show a default icon or warning
2. **Sidebar Position**: Firefox doesn't have an API to programmatically switch sidebar sides. The extension will guide you to do it manually.
3. **Temporary Installation**: Extensions loaded via `about:debugging` are temporary and removed when Firefox restarts. For permanent installation, you'll need to package and sign the extension.

## 📦 Making It Permanent

To keep the extension installed permanently:

### Option 1: Keep Loading Temporarily
- Reload via `about:debugging` each time you restart Firefox

### Option 2: Package the Extension (Advanced)
1. Create a ZIP file of all extension files
2. Rename to `.xpi`
3. Sign it through Mozilla Add-ons (requires account)
4. Install the signed `.xpi` file

See: https://extensionworkshop.com/documentation/publish/

## 🐛 Troubleshooting

### Extension Won't Load
- ✅ Check that `bookmark-48.png` and `bookmark-96.png` exist in `icons/` folder
- ✅ Check browser console for errors (F12)
- ✅ Make sure you selected `manifest.json` when loading

### Sidebar Doesn't Show Bookmarks
- ✅ Open browser console (F12) and check for JavaScript errors
- ✅ Try reloading the extension
- ✅ Check that Firefox has permission to access bookmarks

### Sidebar Is Too Wide/Narrow
- Firefox allows resizing the sidebar by dragging its edge

### Theme Won't Switch
- Check browser console for storage permission errors

## 📝 Next Steps

Once you've tested the basic functionality, we can add:
- ✨ Link status checking (live/dead/parked)
- 🛡️ VirusTotal integration for safety scanning
- 🏷️ Tag support for bookmarks
- 📊 Duplicate bookmark detection
- 🎨 More UI customization options
- ⌨️ Keyboard shortcuts for common actions

## 💬 Support

If you encounter any issues:
1. Check the browser console (F12) for error messages
2. Verify all files are in the correct locations
3. Make sure you have the latest Firefox version
4. Try reloading the extension

Happy bookmark managing! 🔖
