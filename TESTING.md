# Testing Guide

## Quick Start Testing

### 1. Start the Development Server

```bash
# Make the script executable (first time only)
chmod +x start-server.sh

# Start the server
./start-server.sh
```

Or manually:
```bash
python3 -m http.server 8000
```

Then open: http://localhost:8000

### 2. Basic Functionality Tests

#### Test 1: Single Verse
- **Start**: Surah 1 (Al-Fatihah), Verse 1
- **End**: Surah 1 (Al-Fatihah), Verse 1
- **Repeat**: 1
- **Expected**: Should load and play Bismillah once

#### Test 2: Full Surah
- **Start**: Surah 1, Verse 1
- **End**: Surah 1, Verse 7
- **Repeat**: 1
- **Expected**: Should play all 7 verses of Al-Fatihah

#### Test 3: Repetition
- **Start**: Surah 112, Verse 1
- **End**: Surah 112, Verse 4
- **Repeat**: 3
- **Expected**: Should play Al-Ikhlas 3 times completely

#### Test 4: Multiple Surahs
- **Start**: Surah 113, Verse 1
- **End**: Surah 114, Verse 6
- **Expected**: Should play Al-Falaq and An-Nas

### 3. UI/UX Tests

#### Verse Range Selection
- [ ] Surah dropdowns populate correctly
- [ ] Verse dropdowns update based on surah selection
- [ ] Cannot select end verse before start verse (same surah)
- [ ] Dropdowns show Arabic and English names

#### Playback Controls
- [ ] "Load Lesson" button works and shows loading indicator
- [ ] "Play/Pause" button is disabled until lesson is loaded
- [ ] "Play/Pause" icon changes between ▶ and ⏸
- [ ] "Stop" button resets playback to beginning
- [ ] Progress indicator updates correctly

#### Verse Display
- [ ] Verses display in Arabic (right-to-left)
- [ ] Verse numbers show correctly (format: surah:verse)
- [ ] Active verse highlights in yellow
- [ ] Auto-scroll keeps current verse in view
- [ ] Text is readable and properly styled

#### Audio Playback
- [ ] Audio plays for each verse
- [ ] Transitions between verses are smooth
- [ ] Repetition works correctly
- [ ] Pause/resume works mid-lesson
- [ ] Stop button properly stops audio

### 4. Network Tests

#### API Integration
- [ ] Tanzil API returns Quranic text correctly
- [ ] EveryAyah.com audio URLs are correct
- [ ] Error handling for failed API requests
- [ ] Loading indicator shows during network requests

#### Offline Testing
1. Load a lesson with audio playing
2. Disconnect from internet
3. Reload the page
4. [ ] App loads from cache
5. [ ] Previously loaded content still available

### 5. PWA Tests

#### Service Worker
- [ ] Service worker registers successfully (check console)
- [ ] Static resources are cached
- [ ] API responses are cached
- [ ] Audio files are cached (check Network tab)

#### Install Prompt
- [ ] PWA install prompt appears (Chrome/Edge)
- [ ] App can be installed to home screen
- [ ] App opens in standalone mode when installed
- [ ] Icons display correctly (once added)

### 6. Responsive Design Tests

#### Desktop (1920x1080)
- [ ] Layout looks good
- [ ] All controls are accessible
- [ ] Text is readable
- [ ] No horizontal scrolling

#### Tablet (768x1024)
- [ ] Range selectors stack properly
- [ ] Controls are touch-friendly
- [ ] Text size is appropriate
- [ ] Layout adapts well

#### Mobile (375x667)
- [ ] All elements are accessible
- [ ] Buttons are large enough to tap
- [ ] Text is readable without zooming
- [ ] No elements overflow

### 7. Browser Compatibility

Test in:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Edge

### 8. Performance Tests

#### Load Time
- [ ] Initial page load < 2 seconds
- [ ] Lesson loading < 3 seconds (for 10 verses)
- [ ] Audio playback starts promptly

#### Memory Usage
- [ ] No memory leaks during extended use
- [ ] Audio buffers are properly cleaned up
- [ ] No excessive DOM elements

### 9. Edge Cases

#### Invalid Selections
- [ ] Start verse > End verse (same surah) is prevented
- [ ] Empty verse range is handled
- [ ] Invalid surah/verse numbers are handled

#### Network Issues
- [ ] Offline mode works after initial load
- [ ] Failed audio loads don't crash app
- [ ] Failed API requests show error messages
- [ ] Graceful degradation when APIs are down

#### User Actions
- [ ] Rapid clicking of Play/Pause works correctly
- [ ] Changing lesson while playing works
- [ ] Refreshing page during playback is safe

### 10. Accessibility

- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] ARIA labels where appropriate
- [ ] Screen reader friendly (test with VoiceOver/NVDA)
- [ ] Color contrast is sufficient
- [ ] Text can be resized

## Known Limitations

1. **Icons**: PWA icons need to be created (see ICONS.md)
2. **API Rate Limits**: Tanzil API may have rate limits for excessive requests
3. **Audio Format**: Only MP3 format is supported
4. **Offline First Load**: First visit requires internet connection

## Debugging

### Console Logs
Enable verbose logging to debug issues:
- Service Worker registration messages
- API fetch requests and responses
- Audio playback events

### Network Tab
Monitor:
- API request/response times
- Audio file loading
- Cache hits vs network requests

### Common Issues

#### Audio Not Playing
- Check browser autoplay policies
- Ensure HTTPS or localhost
- Verify EveryAyah.com is accessible
- Check audio file URLs in Network tab

#### Text Not Loading
- Verify Tanzil API is accessible
- Check for CORS errors
- Ensure surah/verse numbers are valid

#### Service Worker Issues
- Clear all caches
- Unregister service worker
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

## Testing Checklist Summary

✅ Basic functionality (verse selection, playback, repetition)
✅ UI/UX (controls, display, responsiveness)
✅ API integration (Tanzil, EveryAyah)
✅ PWA features (service worker, offline, install)
✅ Browser compatibility
✅ Performance
✅ Edge cases and error handling
✅ Accessibility

---

**Note**: This is a comprehensive testing guide. Not all tests may be applicable during initial development. Focus on core functionality first, then expand to other areas.
