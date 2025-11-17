# Icons for Bookmark Manager Zero

This extension requires icon files in PNG format.

## Required Files

- `bookmark-48.png` - 48x48 pixels
- `bookmark-96.png` - 96x96 pixels

## Creating Icons

### Option 1: Convert from SVG (Recommended)

Use the included `bookmark.svg` file:

1. Open `bookmark.svg` in a tool like Inkscape, GIMP, or an online converter
2. Export as PNG at 48x48 pixels → save as `bookmark-48.png`
3. Export as PNG at 96x96 pixels → save as `bookmark-96.png`

### Option 2: Use Online Tools

Visit https://realfavicongenerator.net/ or similar tools to generate icons.

### Option 3: Use Emoji as Icon

Create simple emoji-based icons using ImageMagick:

```bash
# Install ImageMagick if needed
sudo apt install imagemagick

# Create 48x48 icon
convert -size 48x48 xc:transparent -font DejaVu-Sans -pointsize 40 -fill '#6366f1' -gravity center -annotate +0+0 '🔖' bookmark-48.png

# Create 96x96 icon
convert -size 96x96 xc:transparent -font DejaVu-Sans -pointsize 80 -fill '#6366f1' -gravity center -annotate +0+0 '🔖' bookmark-96.png
```

## Quick Fix (For Testing)

For quick testing, you can create simple colored squares:

```bash
convert -size 48x48 xc:'#6366f1' bookmark-48.png
convert -size 96x96 xc:'#6366f1' bookmark-96.png
```

The extension will work with any valid PNG files of the correct sizes.
