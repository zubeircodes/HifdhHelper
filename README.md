# Quran Learning App

An interactive Progressive Web App for learning and memorizing the Quran with verse-by-verse audio playback.

## Features

### Core Functionality
- **Verse Range Selection**: Choose any range of verses from any surah to create custom lessons
- **Lesson Repetition**: Configure how many times to repeat the entire lesson (1-100 times)
- **Audio Streaming**: High-quality audio from EveryAyah.com (Mishary Alafasy recitation)
- **Mushaf-Style Display**: Beautiful Arabic text in traditional Quranic script
- **Dual-Buffer Audio System**: Seamless playback with preloading for smooth transitions
- **Verse Highlighting**: Active verse is highlighted and auto-scrolled into view
- **Progressive Web App**: Install on your device and use offline

### Technical Stack
- **Frontend**: Pure HTML, CSS, and JavaScript (no frameworks required)
- **Quran Text**: Local JSON file with Tajweed rules from Quran Universal Library
- **Typography**: KFGQPC Nastaleeq font for authentic Quranic text display
- **Audio Source**: EveryAyah.com for verse-by-verse recitation
- **PWA Features**: Service Worker for offline caching and fast loading
- **Tajweed Display**: Color-coded Tajweed rules for proper recitation learning ([See Tajweed Guide](TAJWEED.md))

## Getting Started

### Quick Start
1. Open `index.html` in a modern web browser
2. Select your verse range (start and end surah/verse)
3. Set the number of repetitions
4. Click "Load Lesson" to fetch the verses
5. Click "Play" to start your lesson

### Installation as PWA
1. Open the app in Chrome/Edge/Safari
2. Click the install button in the address bar
3. The app will be installed on your device
4. Access it from your home screen like a native app

## Usage

### Selecting Verses
1. **Start Verse**: Choose the surah and verse number where you want to begin
2. **End Verse**: Choose the surah and verse number where you want to end
3. The app supports:
   - Single verse (same start and end)
   - Multiple verses in one surah
   - Verses spanning multiple surahs

### Repetition Settings
- Set how many times you want the entire lesson to repeat
- Default is 3 times (recommended for memorization)
- Range: 1-100 repetitions

### Reciter Selection
- Choose from multiple renowned Quran reciters:
  - **Mishary Alafasy** (default) - Clear, melodious recitation
  - **Mahmoud Al-Hussary** - Classical, teaching style
  - **Mohamed Al-Minshawi** - Beautiful, Mujawwad style
- You can change reciters even during a lesson (audio URLs update automatically)

### Playback Controls
- **Load Lesson**: Fetches the Quranic text and prepares audio
- **Play/Pause**: Start or pause the lesson
- **Stop**: Stop playback and reset to the beginning

### Progress Tracking
- The app shows your current repeat number and verse position
- Active verse is highlighted with a yellow background
- Automatic scrolling keeps the current verse in view

## Project Structure

```
quran-learning-app/
├── fonts/
│   └── KFGQPCNastaleeq-Regular.woff2  # KFGQPC Nastaleeq font
├── index.html              # Main HTML structure
├── styles.css              # Styling, responsive design, and Tajweed colors
├── app.js                  # Application logic and data handling
├── service-worker.js       # PWA service worker for offline support
├── manifest.json           # PWA manifest configuration
├── qpc-hafs-tajweed.json   # Complete Quran text with Tajweed (3.2MB)
├── TAJWEED.md             # Tajweed color guide and explanation
└── README.md              # This file
```

## Data Sources

### Quran Text
- **Source**: Quran Universal Library (qpc-hafs-tajweed.json)
- **Script**: Uthmani script with embedded Tajweed rules
- **Format**: Local JSON file with verse keys (surah:verse)
- **Features**: Color-coded Tajweed rules for learning proper recitation
- **Tajweed Rules Included**:
  - Ghunnah (nasal sounds) - Gray
  - Qalqalah (echoing) - Green
  - Madda (elongation types) - Various reds and blues
  - Ikhfa (hidden sounds) - Orange
  - Iqlab (conversion) - Purple
  - And more...

### EveryAyah Audio
- **Base URL**: `https://everyayah.com/data/Alafasy_64kbps/`
- **Format**: `{surah:3}{verse:3}.mp3`
- **Example**: `001001.mp3` for Al-Fatihah verse 1

## Browser Support

### Minimum Requirements
- Modern browser with ES6+ support
- Audio playback capability
- Service Worker support (for PWA features)

### Recommended Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Customization

### Adding More Reciters
The app now includes a reciter dropdown with 3 reciters by default. To add more:

1. Edit `app.js` and update the `RECITERS` object (around line 13):
```javascript
const RECITERS = {
    'Alafasy_64kbps': 'Mishary Alafasy',
    'Husary_64kbps': 'Mahmoud Al-Hussary',
    'Minshawi_Mujawwad_128kbps': 'Mohamed Al-Minshawi',
    'Abdul_Basit_Murattal_64kbps': 'Abdul Basit',  // Add new reciter
    'Ghamadi_40kbps': 'Saad Al-Ghamadi'           // Add another
};
```

2. Update the HTML dropdown in `index.html`:
```html
<select id="reciter-select" class="reciter-select">
    <option value="Alafasy_64kbps">Mishary Alafasy</option>
    <option value="Husary_64kbps">Mahmoud Al-Hussary</option>
    <option value="Minshawi_Mujawwad_128kbps">Mohamed Al-Minshawi</option>
    <option value="Abdul_Basit_Murattal_64kbps">Abdul Basit</option>
    <option value="Ghamadi_40kbps">Saad Al-Ghamadi</option>
</select>
```

**Available reciters on EveryAyah.com:**
- Browse all reciters: https://everyayah.com/data/
- Popular options: Abdul Basit, Saad Al-Ghamadi, Maher Al-Muaiqly, and many more

### Styling
All styling is in `styles.css`. Key CSS variables are defined in `:root`:
- `--primary-color`: Main theme color
- `--accent-color`: Accent/highlight color
- `--font-arabic`: Arabic font family
- `--spacing-*`: Consistent spacing values

## Offline Support

The service worker caches:
- Static resources (HTML, CSS, JS)
- Quran text from API requests
- Audio files (with 7-day expiry)

This allows the app to work offline once content has been loaded at least once.

## Development

### Running Locally
```bash
# Simple HTTP server (Python 3)
python -m http.server 8000

# Or use any other local server
# Then navigate to http://localhost:8000
```

### Future Enhancements
- [ ] User progress tracking and statistics
- [ ] Bookmarking favorite lessons
- [ ] Translation support (English, Urdu, etc.)
- [ ] Tafsir integration
- [ ] Tajweed rules highlighting
- [ ] Custom reciter selection UI
- [ ] Playback speed control
- [ ] Daily lesson reminders (push notifications)

## Credits

### Data Sources
- **Quranic Text**: [Quran Universal Library](https://github.com/quran/quran.com-api) - Tajweed-formatted text
- **Audio Recitation**: [EveryAyah.com](https://everyayah.com)
- **Reciter**: Mishary Rashid Alafasy

## License

This is an educational project. Please respect the terms of use of the data providers:
- Quran Universal Library text is used under their terms
- EveryAyah.com audio is freely available for non-commercial use

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

Built with love for the Quran and its learners worldwide.
# HifdhHelper
