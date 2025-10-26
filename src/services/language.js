import { franc, francAll } from 'franc';

// Language detection service
export class LanguageService {
  // ISO 639-2 (3-char) to ISO 639-1 (2-char) mapping
  static languageCodeMap = {
    'eng': 'en',
    'spa': 'es',
    'fra': 'fr',
    'deu': 'de',
    'ita': 'it',
    'por': 'pt',
    'rus': 'ru',
    'jpn': 'ja',
    'kor': 'ko',
    'cmn': 'zh',
    'zho': 'zh',
    'ara': 'ar',
    'hin': 'hi',
    'pol': 'pl',
    'ces': 'cs',
    'swe': 'sv',
    'dan': 'da',
    'nor': 'no',
    'fin': 'fi',
    'nld': 'nl',
    'tur': 'tr',
    // Add more as needed
  };

  /**
   * Convert ISO 639-2 (3-char) code to ISO 639-1 (2-char) code
   * @param {string} iso6392Code - 3-character language code
   * @returns {string} - 2-character language code
   */
  static toISO6391(iso6392Code) {
    // If already 2-char, return as-is (idempotent)
    if (!iso6392Code || iso6392Code.length <= 2) {
      return iso6392Code || 'en';
    }
    
    // Convert 3-char to 2-char using mapping
    return this.languageCodeMap[iso6392Code] || iso6392Code.slice(0, 2);
  }

  // Character and keyword-based language detection for short text
  static detectLanguageByCharactersAndKeywords(text) {
    if (!text) return null;
    
    const lowerText = text.toLowerCase().trim();
    
    // ============ KEYWORD-BASED DETECTION ============
    
    // Spanish keywords
    const spanishKeywords = ['hola', 'gracias', 'por favor', 'buenos dias', 'buenas tardes', 
                            'buenas noches', 'adios', 'hasta luego', 'si', 'no', 
                            'como estas', 'que tal', 'de nada', 'perdon', 'disculpa'];
    if (spanishKeywords.some(word => lowerText.includes(word))) {
      return 'spa';
    }
    
    // French keywords
    const frenchKeywords = ['bonjour', 'merci', 'salut', 'bonsoir', 'bonne nuit',
                           'au revoir', 'oui', 'non', 'comment allez-vous', 
                           's\'il vous plait', 'pardon', 'excusez-moi', 'de rien'];
    if (frenchKeywords.some(word => lowerText.includes(word))) {
      return 'fra';
    }
    
    // German keywords
    const germanKeywords = ['hallo', 'danke', 'bitte', 'guten tag', 'guten morgen',
                           'guten abend', 'gute nacht', 'auf wiedersehen', 'tschuss',
                           'ja', 'nein', 'wie geht', 'entschuldigung', 'bitte schon'];
    if (germanKeywords.some(word => lowerText.includes(word))) {
      return 'deu';
    }
    
    // Portuguese keywords
    const portugueseKeywords = ['ola', 'obrigado', 'obrigada', 'por favor', 'bom dia',
                               'boa tarde', 'boa noite', 'adeus', 'tchau', 'sim', 'nao',
                               'como vai', 'com licenca', 'desculpe', 'de nada'];
    if (portugueseKeywords.some(word => lowerText.includes(word))) {
      return 'por';
    }
    
    // Italian keywords
    const italianKeywords = ['ciao', 'grazie', 'prego', 'buongiorno', 'buonasera',
                            'buonanotte', 'arrivederci', 'si', 'come sta', 'scusa',
                            'per favore', 'salve'];
    if (italianKeywords.some(word => lowerText.includes(word))) {
      return 'ita';
    }
    
    // ============ CHARACTER-BASED DETECTION ============
    
    // French indicators
    if (/[àâçèéêëîïôùûüÿœæ]/i.test(text)) {
      return 'fra';
    }
    
    // German indicators
    if (/[äöüß]/i.test(text)) {
      return 'deu';
    }
    
    // Spanish indicators
    if (/[áéíóúñ¿¡]/i.test(text) || text.includes('¿') || text.includes('¡')) {
      return 'spa';
    }
    
    // Portuguese indicators (similar to Spanish but distinct)
    if (/[ãõâêôàç]/i.test(text)) {
      return 'por';
    }
    
    // Italian indicators
    if (/[àèéìíîòóùú]/i.test(text)) {
      return 'ita';
    }
    
    // Polish indicators
    if (/[ąćęłńóśźż]/i.test(text)) {
      return 'pol';
    }
    
    // Czech indicators
    if (/[áčďéěíňóřšťúůýž]/i.test(text)) {
      return 'ces';
    }
    
    // Nordic indicators (Swedish, Norwegian, Danish)
    if (/[åæø]/i.test(text)) {
      return 'swe'; // Default to Swedish, could be Norwegian or Danish
    }
    
    return null;
  }

  // Check if text is clearly English based on common patterns
  static isClearlyEnglish(text) {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    // Common English words and patterns
    const englishPatterns = [
      'testing', 'voice', 'memo', 'message', 'hello', 'hi', 'how', 'are', 'you',
      'the', 'and', 'or', 'but', 'this', 'that', 'with', 'from', 'they', 'have',
      'been', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
      'second', 'first', 'third', 'one', 'two', 'three', 'four', 'five'
    ];
    
    // Check for English words
    const englishWordCount = englishPatterns.filter(word => 
      lowerText.includes(word)
    ).length;
    
    // If we find 2+ English words, it's likely English
    if (englishWordCount >= 2) return true;
    
    // Check for English sentence patterns
    const englishSentencePatterns = [
      /^[a-z\s]+$/i,  // Only letters and spaces
      /\b(testing|voice|memo|message)\b/i,  // Common English words
      /\b(the|and|or|but|this|that)\b/i     // Common English articles/conjunctions
    ];
    
    return englishSentencePatterns.some(pattern => pattern.test(text));
  }

  // Detect language using franc library (client-side)
  static detectLanguage(text) {
    try {
      // Minimum text length for reliable detection
      if (!text || text.length < 3) {
        return {
          language: 'en',
          confidence: 0,
          isReliable: false
        };
      }
      
      // Strategy 1: Character and keyword-based detection for short text
      const characterBasedLanguage = this.detectLanguageByCharactersAndKeywords(text);
      
      // Strategy 2: Use franc for detection
      const detected = franc(text);
      const allResults = francAll(text);
      const confidence = allResults[0]?.[1] || 0;
      
      // Strategy 3: Decide which result to use
      let finalLanguage = detected;
      let finalConfidence = confidence;
      let strategy = 'franc';
      
      // If text is short (< 20 chars) and we have character hints, prefer those
      if (text.length < 20 && characterBasedLanguage) {
        // If franc detected 'und' (undetermined) or low confidence, use character-based
        if (detected === 'und' || confidence < 0.5) {
          finalLanguage = characterBasedLanguage;
          finalConfidence = 0.85; // High confidence for character-based
          strategy = 'character-based';
        } else if (characterBasedLanguage !== detected) {
          // Character hints disagree with franc - use character hints if franc confidence is low
          if (confidence < 0.8) {
            finalLanguage = characterBasedLanguage;
            finalConfidence = 0.75;
            strategy = 'character-based (override)';
          }
        }
      }
      
      // If franc detected Esperanto but we have character hints, prefer those
      if (detected === 'epo' && characterBasedLanguage) {
        finalLanguage = characterBasedLanguage;
        finalConfidence = 0.80;
        strategy = 'character-based (override esperanto)';
      }
      
      // Override franc if it detects non-English for clearly English text
      if (detected !== 'eng' && detected !== 'und' && this.isClearlyEnglish(text)) {
        finalLanguage = 'eng';
        finalConfidence = 0.90;
        strategy = 'english-override';
      }
      
      console.log(`🔍 Language detection: "${text}" → ${finalLanguage} (${strategy}, confidence: ${finalConfidence})`);
      
      return {
        language: finalLanguage,
        confidence: finalConfidence,
        isReliable: finalConfidence > 0.7 && finalLanguage !== 'und'
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
      // ISO 639-1 (2-letter codes)
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
      'me': 'Montenegrin',
      
      // ISO 639-3 (3-letter codes) - franc output
      'eng': 'English',
      'spa': 'Spanish',
      'fra': 'French',
      'deu': 'German',
      'ita': 'Italian',
      'por': 'Portuguese',
      'rus': 'Russian',
      'jpn': 'Japanese',
      'kor': 'Korean',
      'cmn': 'Chinese (Mandarin)',
      'zho': 'Chinese',
      'ara': 'Arabic',
      'hin': 'Hindi',
      'tha': 'Thai',
      'vie': 'Vietnamese',
      'tur': 'Turkish',
      'pol': 'Polish',
      'nld': 'Dutch',
      'swe': 'Swedish',
      'dan': 'Danish',
      'nor': 'Norwegian',
      'fin': 'Finnish',
      'ces': 'Czech',
      'hun': 'Hungarian',
      'ron': 'Romanian',
      'bul': 'Bulgarian',
      'hrv': 'Croatian',
      'slk': 'Slovak',
      'slv': 'Slovenian',
      'est': 'Estonian',
      'lav': 'Latvian',
      'lit': 'Lithuanian',
      'ukr': 'Ukrainian',
      'bel': 'Belarusian',
      'mkd': 'Macedonian',
      'sqi': 'Albanian',
      'srp': 'Serbian',
      'bos': 'Bosnian',
      'glg': 'Galician',
      'cat': 'Catalan',
      'eus': 'Basque',
      'isl': 'Icelandic',
      'gle': 'Irish',
      'gla': 'Scottish Gaelic',
      'cym': 'Welsh',
      'heb': 'Hebrew',
      'yid': 'Yiddish',
      'ind': 'Indonesian',
      'msa': 'Malay',
      'tgl': 'Tagalog',
      'swa': 'Swahili',
      'afr': 'Afrikaans',
      'nob': 'Norwegian Bokmål',
      'nno': 'Norwegian Nynorsk',
      'epo': 'Esperanto',
      'und': 'Unknown'
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