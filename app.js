/* ==========================================
   Quran Learning App - Main Application
   ========================================== */

// ==========================================
// Constants and Configuration
// ==========================================

let QURAN_JSON_PATH = 'text/qpc-hafs-tajweed.json'; // Default text source (can be changed by user)
const EVERYAYAH_BASE = 'https://everyayah.com/data';

// Available reciters on EveryAyah.com
const RECITERS = {
    'Alafasy_64kbps': 'Mishary Alafasy',
    'Husary_64kbps': 'Mahmoud Al-Hussary',
    'Minshawy_Murattal_128kbps': 'Mohamed Al-Minshawy'
};

// Cache for Quran text
let quranData = null;

// ==========================================
// Browser Detection
// ==========================================

function isSafariOrChromeIOS() {
    const userAgent = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /CriOS/.test(userAgent); // Chrome on iOS uses CriOS identifier

    // Safari on any platform or Chrome on iOS
    return isSafari || (isIOS && isChrome);
}

function getOptimalTextAndFont() {
    if (isSafariOrChromeIOS()) {
        return {
            textSource: 'text/digital-khatt-v2Text.json',
            font: 'Digital Khatt'
        };
    } else {
        return {
            textSource: 'text/qpc-hafs-tajweed.json',
            font: 'Uthmanic Hafs'
        };
    }
}

// Surah data: name and verse count
const SURAHS = [
    { number: 1, name: 'Al-Fatihah', nameArabic: 'الفاتحة', verses: 7 },
    { number: 2, name: 'Al-Baqarah', nameArabic: 'البقرة', verses: 286 },
    { number: 3, name: 'Ali \'Imran', nameArabic: 'آل عمران', verses: 200 },
    { number: 4, name: 'An-Nisa', nameArabic: 'النساء', verses: 176 },
    { number: 5, name: 'Al-Ma\'idah', nameArabic: 'المائدة', verses: 120 },
    { number: 6, name: 'Al-An\'am', nameArabic: 'الأنعام', verses: 165 },
    { number: 7, name: 'Al-A\'raf', nameArabic: 'الأعراف', verses: 206 },
    { number: 8, name: 'Al-Anfal', nameArabic: 'الأنفال', verses: 75 },
    { number: 9, name: 'At-Tawbah', nameArabic: 'التوبة', verses: 129 },
    { number: 10, name: 'Yunus', nameArabic: 'يونس', verses: 109 },
    { number: 11, name: 'Hud', nameArabic: 'هود', verses: 123 },
    { number: 12, name: 'Yusuf', nameArabic: 'يوسف', verses: 111 },
    { number: 13, name: 'Ar-Ra\'d', nameArabic: 'الرعد', verses: 43 },
    { number: 14, name: 'Ibrahim', nameArabic: 'ابراهيم', verses: 52 },
    { number: 15, name: 'Al-Hijr', nameArabic: 'الحجر', verses: 99 },
    { number: 16, name: 'An-Nahl', nameArabic: 'النحل', verses: 128 },
    { number: 17, name: 'Al-Isra', nameArabic: 'الإسراء', verses: 111 },
    { number: 18, name: 'Al-Kahf', nameArabic: 'الكهف', verses: 110 },
    { number: 19, name: 'Maryam', nameArabic: 'مريم', verses: 98 },
    { number: 20, name: 'Taha', nameArabic: 'طه', verses: 135 },
    { number: 21, name: 'Al-Anbya', nameArabic: 'الأنبياء', verses: 112 },
    { number: 22, name: 'Al-Hajj', nameArabic: 'الحج', verses: 78 },
    { number: 23, name: 'Al-Mu\'minun', nameArabic: 'المؤمنون', verses: 118 },
    { number: 24, name: 'An-Nur', nameArabic: 'النور', verses: 64 },
    { number: 25, name: 'Al-Furqan', nameArabic: 'الفرقان', verses: 77 },
    { number: 26, name: 'Ash-Shu\'ara', nameArabic: 'الشعراء', verses: 227 },
    { number: 27, name: 'An-Naml', nameArabic: 'النمل', verses: 93 },
    { number: 28, name: 'Al-Qasas', nameArabic: 'القصص', verses: 88 },
    { number: 29, name: 'Al-\'Ankabut', nameArabic: 'العنكبوت', verses: 69 },
    { number: 30, name: 'Ar-Rum', nameArabic: 'الروم', verses: 60 },
    { number: 31, name: 'Luqman', nameArabic: 'لقمان', verses: 34 },
    { number: 32, name: 'As-Sajdah', nameArabic: 'السجدة', verses: 30 },
    { number: 33, name: 'Al-Ahzab', nameArabic: 'الأحزاب', verses: 73 },
    { number: 34, name: 'Saba', nameArabic: 'سبإ', verses: 54 },
    { number: 35, name: 'Fatir', nameArabic: 'فاطر', verses: 45 },
    { number: 36, name: 'Ya-Sin', nameArabic: 'يس', verses: 83 },
    { number: 37, name: 'As-Saffat', nameArabic: 'الصافات', verses: 182 },
    { number: 38, name: 'Sad', nameArabic: 'ص', verses: 88 },
    { number: 39, name: 'Az-Zumar', nameArabic: 'الزمر', verses: 75 },
    { number: 40, name: 'Ghafir', nameArabic: 'غافر', verses: 85 },
    { number: 41, name: 'Fussilat', nameArabic: 'فصلت', verses: 54 },
    { number: 42, name: 'Ash-Shuraa', nameArabic: 'الشورى', verses: 53 },
    { number: 43, name: 'Az-Zukhruf', nameArabic: 'الزخرف', verses: 89 },
    { number: 44, name: 'Ad-Dukhan', nameArabic: 'الدخان', verses: 59 },
    { number: 45, name: 'Al-Jathiyah', nameArabic: 'الجاثية', verses: 37 },
    { number: 46, name: 'Al-Ahqaf', nameArabic: 'الأحقاف', verses: 35 },
    { number: 47, name: 'Muhammad', nameArabic: 'محمد', verses: 38 },
    { number: 48, name: 'Al-Fath', nameArabic: 'الفتح', verses: 29 },
    { number: 49, name: 'Al-Hujurat', nameArabic: 'الحجرات', verses: 18 },
    { number: 50, name: 'Qaf', nameArabic: 'ق', verses: 45 },
    { number: 51, name: 'Adh-Dhariyat', nameArabic: 'الذاريات', verses: 60 },
    { number: 52, name: 'At-Tur', nameArabic: 'الطور', verses: 49 },
    { number: 53, name: 'An-Najm', nameArabic: 'النجم', verses: 62 },
    { number: 54, name: 'Al-Qamar', nameArabic: 'القمر', verses: 55 },
    { number: 55, name: 'Ar-Rahman', nameArabic: 'الرحمن', verses: 78 },
    { number: 56, name: 'Al-Waqi\'ah', nameArabic: 'الواقعة', verses: 96 },
    { number: 57, name: 'Al-Hadid', nameArabic: 'الحديد', verses: 29 },
    { number: 58, name: 'Al-Mujadila', nameArabic: 'المجادلة', verses: 22 },
    { number: 59, name: 'Al-Hashr', nameArabic: 'الحشر', verses: 24 },
    { number: 60, name: 'Al-Mumtahanah', nameArabic: 'الممتحنة', verses: 13 },
    { number: 61, name: 'As-Saf', nameArabic: 'الصف', verses: 14 },
    { number: 62, name: 'Al-Jumu\'ah', nameArabic: 'الجمعة', verses: 11 },
    { number: 63, name: 'Al-Munafiqun', nameArabic: 'المنافقون', verses: 11 },
    { number: 64, name: 'At-Taghabun', nameArabic: 'التغابن', verses: 18 },
    { number: 65, name: 'At-Talaq', nameArabic: 'الطلاق', verses: 12 },
    { number: 66, name: 'At-Tahrim', nameArabic: 'التحريم', verses: 12 },
    { number: 67, name: 'Al-Mulk', nameArabic: 'الملك', verses: 30 },
    { number: 68, name: 'Al-Qalam', nameArabic: 'القلم', verses: 52 },
    { number: 69, name: 'Al-Haqqah', nameArabic: 'الحاقة', verses: 52 },
    { number: 70, name: 'Al-Ma\'arij', nameArabic: 'المعارج', verses: 44 },
    { number: 71, name: 'Nuh', nameArabic: 'نوح', verses: 28 },
    { number: 72, name: 'Al-Jinn', nameArabic: 'الجن', verses: 28 },
    { number: 73, name: 'Al-Muzzammil', nameArabic: 'المزمل', verses: 20 },
    { number: 74, name: 'Al-Muddaththir', nameArabic: 'المدثر', verses: 56 },
    { number: 75, name: 'Al-Qiyamah', nameArabic: 'القيامة', verses: 40 },
    { number: 76, name: 'Al-Insan', nameArabic: 'الانسان', verses: 31 },
    { number: 77, name: 'Al-Mursalat', nameArabic: 'المرسلات', verses: 50 },
    { number: 78, name: 'An-Naba', nameArabic: 'النبإ', verses: 40 },
    { number: 79, name: 'An-Nazi\'at', nameArabic: 'النازعات', verses: 46 },
    { number: 80, name: '\'Abasa', nameArabic: 'عبس', verses: 42 },
    { number: 81, name: 'At-Takwir', nameArabic: 'التكوير', verses: 29 },
    { number: 82, name: 'Al-Infitar', nameArabic: 'الإنفطار', verses: 19 },
    { number: 83, name: 'Al-Mutaffifin', nameArabic: 'المطففين', verses: 36 },
    { number: 84, name: 'Al-Inshiqaq', nameArabic: 'الإنشقاق', verses: 25 },
    { number: 85, name: 'Al-Buruj', nameArabic: 'البروج', verses: 22 },
    { number: 86, name: 'At-Tariq', nameArabic: 'الطارق', verses: 17 },
    { number: 87, name: 'Al-A\'la', nameArabic: 'الأعلى', verses: 19 },
    { number: 88, name: 'Al-Ghashiyah', nameArabic: 'الغاشية', verses: 26 },
    { number: 89, name: 'Al-Fajr', nameArabic: 'الفجر', verses: 30 },
    { number: 90, name: 'Al-Balad', nameArabic: 'البلد', verses: 20 },
    { number: 91, name: 'Ash-Shams', nameArabic: 'الشمس', verses: 15 },
    { number: 92, name: 'Al-Layl', nameArabic: 'الليل', verses: 21 },
    { number: 93, name: 'Ad-Duhaa', nameArabic: 'الضحى', verses: 11 },
    { number: 94, name: 'Ash-Sharh', nameArabic: 'الشرح', verses: 8 },
    { number: 95, name: 'At-Tin', nameArabic: 'التين', verses: 8 },
    { number: 96, name: 'Al-\'Alaq', nameArabic: 'العلق', verses: 19 },
    { number: 97, name: 'Al-Qadr', nameArabic: 'القدر', verses: 5 },
    { number: 98, name: 'Al-Bayyinah', nameArabic: 'البينة', verses: 8 },
    { number: 99, name: 'Az-Zalzalah', nameArabic: 'الزلزلة', verses: 8 },
    { number: 100, name: 'Al-\'Adiyat', nameArabic: 'العاديات', verses: 11 },
    { number: 101, name: 'Al-Qari\'ah', nameArabic: 'القارعة', verses: 11 },
    { number: 102, name: 'At-Takathur', nameArabic: 'التكاثر', verses: 8 },
    { number: 103, name: 'Al-\'Asr', nameArabic: 'العصر', verses: 3 },
    { number: 104, name: 'Al-Humazah', nameArabic: 'الهمزة', verses: 9 },
    { number: 105, name: 'Al-Fil', nameArabic: 'الفيل', verses: 5 },
    { number: 106, name: 'Quraysh', nameArabic: 'قريش', verses: 4 },
    { number: 107, name: 'Al-Ma\'un', nameArabic: 'الماعون', verses: 7 },
    { number: 108, name: 'Al-Kawthar', nameArabic: 'الكوثر', verses: 3 },
    { number: 109, name: 'Al-Kafirun', nameArabic: 'الكافرون', verses: 6 },
    { number: 110, name: 'An-Nasr', nameArabic: 'النصر', verses: 3 },
    { number: 111, name: 'Al-Masad', nameArabic: 'المسد', verses: 5 },
    { number: 112, name: 'Al-Ikhlas', nameArabic: 'الإخلاص', verses: 4 },
    { number: 113, name: 'Al-Falaq', nameArabic: 'الفلق', verses: 5 },
    { number: 114, name: 'An-Nas', nameArabic: 'الناس', verses: 6 }
];

// ==========================================
// Application State
// ==========================================

const state = {
    verses: [],
    audioBuffers: {
        current: null,
        next: null
    },
    currentVerseIndex: 0,
    currentRepeat: 1,
    totalRepeats: 3,
    selectedReciter: 'Alafasy_64kbps',
    isPlaying: false,
    lessonLoaded: false
};

// ==========================================
// DOM Elements
// ==========================================

const elements = {
    startSurah: document.getElementById('start-surah'),
    startVerse: document.getElementById('start-verse'),
    endSurah: document.getElementById('end-surah'),
    endVerse: document.getElementById('end-verse'),
    repeatCount: document.getElementById('repeat-count'),
    decreaseRepeat: document.getElementById('repeat-decrease'),
    increaseRepeat: document.getElementById('repeat-increase'),
    reciterSelect: document.getElementById('reciter-select'),
    // fontSelect and textSelect removed - auto-selected based on browser
    loadLesson: document.getElementById('load-lesson'),
    playPause: document.getElementById('play-pause'),
    playIcon: document.getElementById('play-icon'),
    stop: document.getElementById('stop'),
    versesContainer: document.getElementById('verses-container'),
    currentProgress: document.getElementById('current-progress'),
    loading: document.getElementById('loading')
};

// ==========================================
// Initialization
// ==========================================

function init() {
    populateSurahSelectors();
    attachEventListeners();
    updateVerseSelectors();
    applyOptimalTextAndFont();
}

function applyOptimalTextAndFont() {
    // Automatically select optimal text source and font based on browser
    const optimal = getOptimalTextAndFont();

    console.log('Browser detected - Using:', optimal);

    // Set the text source
    QURAN_JSON_PATH = optimal.textSource;

    // Apply the font
    applyFont(optimal.font);
}

function populateSurahSelectors() {
    const startSurahHTML = SURAHS.map(surah =>
        `<option value="${surah.number}">${surah.number}. ${surah.nameArabic} (${surah.name})</option>`
    ).join('');

    elements.startSurah.innerHTML = startSurahHTML;
    elements.endSurah.innerHTML = startSurahHTML;

    // Default to Al-Fatihah
    elements.startSurah.value = '1';
    elements.endSurah.value = '1';
}

function updateVerseSelectors() {
    const startSurahNum = parseInt(elements.startSurah.value);
    const endSurahNum = parseInt(elements.endSurah.value);

    const startSurah = SURAHS.find(s => s.number === startSurahNum);
    const endSurah = SURAHS.find(s => s.number === endSurahNum);

    // Populate start verse selector
    elements.startVerse.innerHTML = Array.from(
        { length: startSurah.verses },
        (_, i) => `<option value="${i + 1}">${i + 1}</option>`
    ).join('');

    // Populate end verse selector
    elements.endVerse.innerHTML = Array.from(
        { length: endSurah.verses },
        (_, i) => `<option value="${i + 1}">${i + 1}</option>`
    ).join('');

    // Default both to verse 1
    elements.startVerse.value = '1';
    elements.endVerse.value = '1';

    // Auto-adjust end verse if needed
    if (startSurahNum === endSurahNum) {
        const startVerseNum = parseInt(elements.startVerse.value) || 1;
        if (startVerseNum > parseInt(elements.endVerse.value)) {
            elements.endVerse.value = startVerseNum;
        }
    }
}

function attachEventListeners() {
    elements.startSurah.addEventListener('change', () => {
        // Auto-match end surah to start surah
        elements.endSurah.value = elements.startSurah.value;
        updateVerseSelectors();
    });

    elements.endSurah.addEventListener('change', updateVerseSelectors);

    elements.startVerse.addEventListener('change', () => {
        // Auto-match end verse to start verse (only if same surah)
        const startSurahNum = parseInt(elements.startSurah.value);
        const endSurahNum = parseInt(elements.endSurah.value);

        if (startSurahNum === endSurahNum) {
            elements.endVerse.value = elements.startVerse.value;
        }
        validateVerseRange();
    });

    elements.endVerse.addEventListener('change', validateVerseRange);

    // Repeat count adjustment buttons
    elements.decreaseRepeat.addEventListener('click', () => {
        const currentValue = parseInt(elements.repeatCount.value) || 1;
        if (currentValue > 1) {
            elements.repeatCount.value = currentValue - 1;
        }
    });

    elements.increaseRepeat.addEventListener('click', () => {
        const currentValue = parseInt(elements.repeatCount.value) || 1;
        if (currentValue < 100) {
            elements.repeatCount.value = currentValue + 1;
        }
    });

    // Allow manual input with validation
    elements.repeatCount.addEventListener('input', (e) => {
        let value = parseInt(e.target.value);

        // If empty or invalid, don't change yet
        if (isNaN(value) || e.target.value === '') {
            return;
        }

        // Enforce bounds
        if (value < 1) {
            e.target.value = 1;
        } else if (value > 100) {
            e.target.value = 100;
        }
    });

    // Validate on blur (when user leaves the field)
    elements.repeatCount.addEventListener('blur', (e) => {
        let value = parseInt(e.target.value);

        // If empty or invalid, reset to default
        if (isNaN(value) || e.target.value === '') {
            e.target.value = 3;
        }
    });

    elements.reciterSelect.addEventListener('change', handleReciterChange);
    // Font and text are now auto-selected based on browser - no manual selection needed

    elements.loadLesson.addEventListener('click', loadLesson);
    elements.playPause.addEventListener('click', togglePlayPause);
    elements.stop.addEventListener('click', stopPlayback);
}

function handleReciterChange() {
    state.selectedReciter = elements.reciterSelect.value;
    console.log('Reciter changed to:', RECITERS[state.selectedReciter]);

    // If a lesson is loaded, update audio URLs
    if (state.lessonLoaded) {
        state.verses.forEach(verse => {
            verse.audioUrl = getAudioUrl(verse.surah, verse.verse);
        });
        console.log('Audio URLs updated for new reciter');
    }
}

function handleFontChange() {
    const selectedFont = elements.fontSelect.value;
    console.log('Font changed to:', selectedFont);

    // Apply the font to all verse elements and the header
    applyFont(selectedFont);

    // Save the font preference to localStorage
    localStorage.setItem('selectedFont', selectedFont);
}

function handleTextChange() {
    const selectedText = elements.textSelect.value;
    console.log('Text source changed to:', selectedText);

    // Update the text source path
    QURAN_JSON_PATH = selectedText;

    // Clear the cached quran data so it reloads
    quranData = null;

    // Save the text preference to localStorage
    localStorage.setItem('selectedText', selectedText);

    // If a lesson is currently loaded, reload it with the new text
    if (state.verses.length > 0) {
        console.log('Reloading lesson with new text source...');
        loadLesson();
    }
}

function applyFont(fontFamily) {
    // Enhanced font stack with proper Arabic fallbacks for iOS Safari
    const fontStack = `'${fontFamily}', 'Noto Naskh Arabic', 'Traditional Arabic', 'Arabic Typesetting', 'Geeza Pro', serif`;

    // Update CSS variable for Arabic font
    document.documentElement.style.setProperty('--font-arabic', fontStack);

    // Get verses container
    const versesContainer = document.getElementById('verses-container');

    // For Noto Naskh Arabic, add 'plain-text' class to disable tajweed colors
    if (fontFamily === 'Noto Naskh Arabic') {
        if (versesContainer) {
            versesContainer.classList.add('plain-text');
        }
    } else {
        // Remove plain-text class for all other fonts to show tajweed colors
        if (versesContainer) {
            versesContainer.classList.remove('plain-text');
        }
    }

    // Apply font to verses container
    if (versesContainer) {
        versesContainer.style.fontFamily = fontStack;
    }

    // Apply to header
    const header = document.querySelector('.app-header h1');
    if (header) {
        header.style.fontFamily = fontStack;
    }
}

function validateVerseRange() {
    const startSurahNum = parseInt(elements.startSurah.value);
    const endSurahNum = parseInt(elements.endSurah.value);
    const startVerseNum = parseInt(elements.startVerse.value);
    const endVerseNum = parseInt(elements.endVerse.value);

    // If same surah, ensure start verse <= end verse
    if (startSurahNum === endSurahNum && startVerseNum > endVerseNum) {
        elements.endVerse.value = startVerseNum;
    }
}

// ==========================================
// Lesson Loading
// ==========================================

async function loadLesson() {
    try {
        showLoading(true);

        // Get verse range
        const verseRange = getVerseRange();
        if (!verseRange || verseRange.length === 0) {
            alert('Invalid verse range selected');
            return;
        }

        // Fetch Quran text
        state.verses = await fetchVerses(verseRange);

        // Display verses
        displayVerses();

        // Get repeat count
        state.totalRepeats = parseInt(elements.repeatCount.value) || 1;
        state.currentRepeat = 1;
        state.currentVerseIndex = 0;
        state.lessonLoaded = true;

        // Enable controls
        elements.playPause.disabled = false;
        elements.stop.disabled = false;

        updateProgress();
        showLoading(false);

    } catch (error) {
        console.error('Error loading lesson:', error);
        alert('Failed to load lesson. Please check your internet connection and try again.');
        showLoading(false);
    }
}

function getVerseRange() {
    const startSurahNum = parseInt(elements.startSurah.value);
    const endSurahNum = parseInt(elements.endSurah.value);
    const startVerseNum = parseInt(elements.startVerse.value);
    const endVerseNum = parseInt(elements.endVerse.value);

    const range = [];

    for (let surahNum = startSurahNum; surahNum <= endSurahNum; surahNum++) {
        const surah = SURAHS.find(s => s.number === surahNum);

        let firstVerse = 1;
        let lastVerse = surah.verses;

        if (surahNum === startSurahNum) {
            firstVerse = startVerseNum;
        }
        if (surahNum === endSurahNum) {
            lastVerse = endVerseNum;
        }

        for (let verseNum = firstVerse; verseNum <= lastVerse; verseNum++) {
            range.push({ surah: surahNum, verse: verseNum });
        }
    }

    return range;
}

async function loadQuranData() {
    if (quranData) {
        return quranData;
    }

    try {
        const response = await fetch(QURAN_JSON_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load Quran data: ${response.status}`);
        }
        quranData = await response.json();
        console.log('Quran data loaded successfully');
        return quranData;
    } catch (error) {
        console.error('Error loading Quran data:', error);
        throw error;
    }
}

function detectDataFormat(data) {
    // Check the first key to determine the format
    const firstKey = Object.keys(data)[0];

    // Word-by-word format has keys like "1:1:1" (surah:ayah:word)
    // Verse format has keys like "1:1" (surah:ayah)
    const parts = firstKey.split(':');

    if (parts.length === 3) {
        return 'word-by-word'; // Digital Khatt format
    } else {
        return 'verse'; // QPC Hafs format
    }
}

function getVerseText(data, surah, verse, format) {
    if (format === 'verse') {
        // Direct verse lookup (QPC Hafs format)
        const verseKey = `${surah}:${verse}`;
        const verseData = data[verseKey];
        return verseData ? verseData.text : null;
    } else {
        // Word-by-word format (Digital Khatt format)
        // Collect all words for this verse and combine them
        const words = [];
        let wordIndex = 1;

        while (true) {
            const wordKey = `${surah}:${verse}:${wordIndex}`;
            const wordData = data[wordKey];

            if (!wordData) {
                break; // No more words for this verse
            }

            words.push(wordData.text);
            wordIndex++;
        }

        if (words.length === 0) {
            return null; // Verse not found
        }

        // Join words with space
        return words.join(' ');
    }
}

async function fetchVerses(verseRange) {
    const verses = [];

    // Load Quran data from local JSON file
    const data = await loadQuranData();

    // Detect the data format
    const format = detectDataFormat(data);
    console.log('Detected Quran data format:', format);

    for (const { surah, verse } of verseRange) {
        try {
            const text = getVerseText(data, surah, verse, format);

            if (!text) {
                throw new Error(`Verse ${surah}:${verse} not found`);
            }

            verses.push({
                surah,
                verse,
                text: text,
                audioUrl: getAudioUrl(surah, verse)
            });

        } catch (error) {
            console.error(`Error fetching verse ${surah}:${verse}:`, error);
            // Add placeholder for failed verses
            verses.push({
                surah,
                verse,
                text: `[Error loading verse ${surah}:${verse}]`,
                audioUrl: getAudioUrl(surah, verse)
            });
        }
    }

    return verses;
}

function getAudioUrl(surah, verse) {
    const surahPadded = String(surah).padStart(3, '0');
    const versePadded = String(verse).padStart(3, '0');
    return `${EVERYAYAH_BASE}/${state.selectedReciter}/${surahPadded}${versePadded}.mp3`;
}

function displayVerses() {
    elements.versesContainer.innerHTML = state.verses.map((verse, index) => `
        <div class="verse" data-index="${index}" id="verse-${index}">
            <span class="verse-number">${verse.surah}:${verse.verse}</span>
            ${verse.text}
        </div>
    `).join('');
}

// ==========================================
// Audio Playback with Dual Buffer System
// ==========================================

async function togglePlayPause() {
    if (state.isPlaying) {
        pausePlayback();
    } else {
        await startPlayback();
    }
}

async function startPlayback() {
    if (!state.lessonLoaded) return;

    state.isPlaying = true;
    elements.playIcon.textContent = '⏸';
    elements.playPause.querySelector('span').nextSibling.textContent = ' Pause';

    await playNextVerse();
}

function pausePlayback() {
    state.isPlaying = false;
    elements.playIcon.textContent = '▶';
    elements.playPause.querySelector('span').nextSibling.textContent = ' Play';

    // Pause current audio if playing
    if (state.audioBuffers.current) {
        state.audioBuffers.current.pause();
    }
}

function stopPlayback() {
    state.isPlaying = false;
    state.currentVerseIndex = 0;
    state.currentRepeat = 1;

    elements.playIcon.textContent = '▶';
    elements.playPause.querySelector('span').nextSibling.textContent = ' Play';

    // Stop and clear audio
    if (state.audioBuffers.current) {
        state.audioBuffers.current.pause();
        state.audioBuffers.current = null;
    }
    if (state.audioBuffers.next) {
        state.audioBuffers.next.pause();
        state.audioBuffers.next = null;
    }

    // Clear highlighting
    document.querySelectorAll('.verse').forEach(v => v.classList.remove('active'));

    updateProgress();
}

async function playNextVerse() {
    if (!state.isPlaying) return;

    // Check if lesson is complete
    if (state.currentRepeat > state.totalRepeats) {
        stopPlayback();
        alert('Lesson complete! Well done!');
        return;
    }

    // Check if we need to repeat
    if (state.currentVerseIndex >= state.verses.length) {
        state.currentVerseIndex = 0;
        state.currentRepeat++;

        if (state.currentRepeat > state.totalRepeats) {
            stopPlayback();
            alert('Lesson complete! Well done!');
            return;
        }
    }

    const currentVerse = state.verses[state.currentVerseIndex];

    // Highlight current verse
    highlightVerse(state.currentVerseIndex);
    updateProgress();

    // Play audio using dual-buffer system
    await playAudio(currentVerse.audioUrl);

    // Move to next verse
    state.currentVerseIndex++;

    // Continue playing
    if (state.isPlaying) {
        await playNextVerse();
    }
}

async function playAudio(audioUrl) {
    console.log('🎵 Attempting to play:', audioUrl);  // ← ADD THIS LINE
    return new Promise((resolve, reject) => {
        // Use current buffer or create new one
        if (!state.audioBuffers.current) {
            state.audioBuffers.current = new Audio();
        }

        const audio = state.audioBuffers.current;
        audio.src = audioUrl;

        // Preload next audio in background
        preloadNextAudio();

        audio.onended = () => {
            resolve();
        };

        audio.onerror = (error) => {
            console.error('Audio playback error:', error);
            resolve(); // Continue to next verse even if error
        };

        audio.play().catch(error => {
            console.error('Play error:', error);
            resolve();
        });
    });
}

function preloadNextAudio() {
    const nextIndex = state.currentVerseIndex + 1;

    if (nextIndex < state.verses.length) {
        const nextVerse = state.verses[nextIndex];

        if (!state.audioBuffers.next) {
            state.audioBuffers.next = new Audio();
        }

        state.audioBuffers.next.src = nextVerse.audioUrl;
        state.audioBuffers.next.load();
    }
}

// ==========================================
// UI Updates
// ==========================================

function highlightVerse(index) {
    // Remove all highlights
    document.querySelectorAll('.verse').forEach(v => v.classList.remove('active'));

    // Add highlight to current verse
    const verseElement = document.getElementById(`verse-${index}`);
    if (verseElement) {
        verseElement.classList.add('active');
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function updateProgress() {
    if (!state.lessonLoaded) {
        elements.currentProgress.textContent = 'Ready to start';
        return;
    }

    const totalVerses = state.verses.length;
    const currentVerse = state.currentVerseIndex + 1;

    if (!state.isPlaying && state.currentVerseIndex === 0) {
        elements.currentProgress.textContent = `Ready: ${totalVerses} verses, ${state.totalRepeats} repeats`;
    } else {
        elements.currentProgress.textContent =
            `Repeat ${state.currentRepeat}/${state.totalRepeats} • Verse ${currentVerse}/${totalVerses}`;
    }
}

function showLoading(show) {
    if (show) {
        elements.loading.classList.remove('hidden');
    } else {
        elements.loading.classList.add('hidden');
    }
}

// ==========================================
// Service Worker Registration
// ==========================================

// TEMPORARILY DISABLED FOR TESTING - REMOVE COMMENT TO RE-ENABLE
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
*/

// ==========================================
// Start Application
// ==========================================

document.addEventListener('DOMContentLoaded', init);
