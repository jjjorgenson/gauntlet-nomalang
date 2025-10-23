import franc from 'franc';

// Language detection service
export class LanguageService {
  // Detect language using franc library (client-side)
  static detectLanguage(text) {
    try {
      const detected = franc(text);
      const confidence = franc.all(text)[0]?.score || 0;
      
      return {
        language: detected,
        confidence: confidence,
        isReliable: confidence > 0.8
      };
    } catch (error) {
      console.error('Error detecting language:', error);
      return {
        language: 'en',
        confidence: 0,
        isReliable: false
      };
    }
  }

  // Get language name from code
  static getLanguageName(code) {
    const languages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'tr': 'Turkish',
      'pl': 'Polish',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'uk': 'Ukrainian',
      'be': 'Belarusian',
      'mk': 'Macedonian',
      'sq': 'Albanian',
      'sr': 'Serbian',
      'bs': 'Bosnian',
      'me': 'Montenegrin'
    };

    return languages[code] || code;
  }

  // Check if language needs translation
  static needsTranslation(text, userLanguage) {
    const detection = this.detectLanguage(text);
    return detection.language !== userLanguage && detection.isReliable;
  }

  // Get supported languages
  static getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', flag: '🇪🇸' },
      { code: 'fr', name: 'French', flag: '🇫🇷' },
      { code: 'de', name: 'German', flag: '🇩🇪' },
      { code: 'it', name: 'Italian', flag: '🇮🇹' },
      { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
      { code: 'ru', name: 'Russian', flag: '🇷🇺' },
      { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', flag: '🇰🇷' },
      { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
      { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
      { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
      { code: 'th', name: 'Thai', flag: '🇹🇭' },
      { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
      { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
      { code: 'pl', name: 'Polish', flag: '🇵🇱' },
      { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
      { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
      { code: 'da', name: 'Danish', flag: '🇩🇰' },
      { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
      { code: 'fi', name: 'Finnish', flag: '🇫🇮' }
    ];
  }

  // Format language for display
  static formatLanguage(code) {
    const name = this.getLanguageName(code);
    const supported = this.getSupportedLanguages().find(lang => lang.code === code);
    const flag = supported?.flag || '🌐';
    
    return `${flag} ${name}`;
  }
}

export default LanguageService;
