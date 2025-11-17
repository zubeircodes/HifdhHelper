# PWA Icons Setup

The PWA manifest references two icon sizes that need to be created:

## Required Icons

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

## How to Create Icons

### Option 1: Using Online Tools
1. Visit [Favicon Generator](https://realfavicongenerator.net/)
2. Upload your logo/icon design
3. Generate and download the icon pack
4. Extract `icon-192.png` and `icon-512.png` to the project root

### Option 2: Using Design Software
1. Create a square design (e.g., 512x512)
2. Use Islamic green color scheme (#1a472a)
3. Consider using:
   - Crescent moon symbol
   - Quran book icon
   - Arabic calligraphy
   - Geometric Islamic patterns
4. Export as PNG at 192x192 and 512x512

### Option 3: Quick Placeholder
For development, you can use a solid color placeholder:

```bash
# Using ImageMagick
convert -size 192x192 xc:#1a472a icon-192.png
convert -size 512x512 xc:#1a472a icon-512.png
```

## Design Guidelines

### Colors
- Primary: #1a472a (Islamic green)
- Accent: #c9a961 (Gold)
- Background: White or transparent

### Content
- Keep it simple and recognizable at small sizes
- Ensure good contrast
- Avoid thin lines (they don't scale well)
- Center the main icon element

### Format
- PNG format with transparency
- Square aspect ratio (1:1)
- Optimized file size

## Temporary Solution

Until proper icons are created, the app will work fine but:
- PWA installation will use a default icon
- The icons won't show on the home screen

The manifest is already configured to use these icons once you add them to the project root directory.
