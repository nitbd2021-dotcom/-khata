import { Customer, TransactionType, VoiceParseResult } from '../types';

// Bangla numeral mapping
const banglaDigits: { [key: string]: string } = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

// Common Bangla spoken numbers
const banglaNumberWords: { [key: string]: number } = {
  'এক লাখ': 100000, 'দুই লাখ': 200000, 'লাখ': 100000, 'লক্ষ': 100000,
  'পঞ্চাশ হাজার': 50000, 'চল্লিশ হাজার': 40000, 'ত্রিশ হাজার': 30000, 'বিশ হাজার': 20000, 'দশ হাজার': 10000,
  'পাঁচ হাজার': 5000, 'চার হাজার': 4000, 'তিন হাজার': 3000, 'দুই হাজার': 2000, 'এক হাজার': 1000,
  'আড়াই হাজার': 2500, 'দেড় হাজার': 1500, 'হাজার': 1000,
  'নয়শত': 900, 'নয়শো': 900, 'নয়শ': 900,
  'আটশত': 800, 'আটশো': 800, 'আটশ': 800,
  'সাতশত': 700, 'সাতশো': 700, 'সাতশ': 700,
  'ছয়শত': 600, 'ছয়শো': 600, 'ছয়শ': 600,
  'পাঁচশত': 500, 'পাঁচশো': 500, 'পাঁচশ': 500,
  'চারশত': 400, 'চারশো': 400, 'চারশ': 400,
  'তিনশত': 300, 'তিনশো': 300, 'তিনশ': 300,
  'দুইশত': 200, 'দুইশো': 200, 'দুইশ': 200,
  'একশত': 100, 'একশো': 100, 'একশ': 100, 'শত': 100,
  'নব্বই': 90, 'আশি': 80, 'সত্তর': 70, 'ষাট': 60, 'পঞ্চাশ': 50,
  'চল্লিশ': 40, 'ত্রিশ': 30, 'পঁচিশ': 25, 'বিশ': 20, 'পনের': 15, 'দশ': 10, 'পাঁচ': 5
};

export const parseBanglaAmount = (text: string): number => {
  // 1. Convert Bangla numerals to ASCII numerals and check for direct digit numbers first
  let converted = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (banglaDigits[char]) {
      converted += banglaDigits[char];
    } else {
      converted += char;
    }
  }

  // Find regex numbers (both converted Bangla digits and English digits)
  const match = converted.match(/\d+(\.\d+)?/);
  if (match) {
    return parseFloat(match[0]);
  }

  // 2. Check word numbers sorted by length descending so longer compound phrases match first
  const sortedWords = Object.keys(banglaNumberWords).sort((a, b) => b.length - a.length);
  for (const word of sortedWords) {
    if (text.includes(word)) {
      let total = banglaNumberWords[word];
      if (word.includes('হাজার')) {
        for (const subWord of sortedWords) {
          if ((subWord.includes('শ') || subWord.includes('শত')) && text.includes(subWord)) {
            total += banglaNumberWords[subWord];
            break;
          }
        }
      }
      return total;
    }
  }

  return 0;
};

export const convertBanglaToEnglishDigits = (text: string): string => {
  let converted = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (banglaDigits[char]) {
      converted += banglaDigits[char];
    } else {
      converted += char;
    }
  }
  return converted;
};

const spokenDigitWordMap: { [key: string]: string } = {
  'শূন্য': '0', 'শুন্য': '0', 'জিরো': '0', 'zero': '0',
  'এক': '1', 'ওয়ান': '1', 'one': '1',
  'দুই': '2', 'টু': '2', 'two': '2',
  'তিন': '3', 'থ্রি': '3', 'three': '3',
  'চার': '4', 'ফোর': '4', 'four': '4',
  'পাঁচ': '5', 'পাচ': '5', 'ফাইভ': '5', 'five': '5',
  'ছয়': '6', 'ছয়': '6', 'সিক্স': '6', 'six': '6',
  'সাত': '7', 'সেভেন': '7', 'seven': '7',
  'আট': '8', 'এইট': '8', 'eight': '8',
  'নয়': '9', 'নয়': '9', 'নাইন': '9', 'nine': '9',
};

/**
 * Extracts and normalizes spoken phone number from voice input.
 * Supports digits, spoken Bangla digit words (e.g. 'শূন্য এক সাত...'),
 * and standard 11-digit Bangladeshi mobile formats.
 */
export const parseSpokenPhoneNumber = (text: string): string => {
  if (!text) return '';

  let processed = text;
  // Replace spoken words with digits
  for (const [word, digit] of Object.entries(spokenDigitWordMap)) {
    processed = processed.replace(new RegExp(word, 'gi'), digit);
  }

  // Convert any Bengali numerals to English numerals
  processed = convertBanglaToEnglishDigits(processed);

  // Extract all digit characters
  const digitsOnly = processed.replace(/\D/g, '');

  if (!digitsOnly) return '';

  // If starts with 880, strip 88 to normalize to 01...
  if (digitsOnly.startsWith('880') && digitsOnly.length >= 13) {
    return digitsOnly.substring(2, 13);
  }

  // If 10 digits starting with 1... (e.g. 1712345678), add leading 0
  if (digitsOnly.length === 10 && digitsOnly.startsWith('1')) {
    return '0' + digitsOnly;
  }

  // If 11 digits or longer starting with 01
  const bdMatch = digitsOnly.match(/01\d{9}/);
  if (bdMatch) {
    return bdMatch[0];
  }

  // Otherwise return whatever digits were spoken (up to 11 chars or as entered)
  return digitsOnly.slice(0, 11);
};

/**
 * Parses spoken customer name, phone, and optional address from combined voice command.
 */
export const parseCustomerVoiceInput = (text: string): { name: string; phone: string; address?: string } => {
  if (!text) return { name: '', phone: '', address: '' };

  const phone = parseSpokenPhoneNumber(text);

  let address = '';
  let name = text;

  // Check for address markers (e.g. 'ঠিকানা ...' or 'বাসা ...' or 'দোকান ...')
  const addressMatch = text.match(/(?:ঠিকানা|বাসা|দোকান|এলাকা)\s*[:=]?\s*([^\n,।]+)/i);
  if (addressMatch && addressMatch[1]) {
    address = addressMatch[1].trim();
    // Clean phone numbers or trigger words out of address if any caught
    address = address.replace(/01\d{9}/g, '').replace(/[০-৯0-9]+/g, '').trim();
    name = name.replace(addressMatch[0], '');
  }

  // Remove phone numbers or digits
  name = name.replace(/01\d{9}/g, '');
  name = name.replace(/[০-৯0-9]+/g, '');

  // Remove common trigger words
  const removeKeywords = [
    'নতুন কাস্টমার', 'কাস্টমার', 'নাম', 'মোবাইল', 'নাম্বার', 'নম্বর', 'ফোন', 'ঠিকানা', 'বাসা', 'দোকান', 'হলো', 'হল'
  ];

  for (const kw of removeKeywords) {
    name = name.replace(new RegExp(kw, 'gi'), '');
  }

  name = name.replace(/[^\u0980-\u09FFa-zA-Z\s]/g, ' ').trim();
  name = name.replace(/\s+/g, ' ').trim();

  return {
    name,
    phone,
    address
  };
};

/**
 * Extracts a spoken customer unique code from speech transcript.
 * Supports:
 * - 4 digits (e.g. A1111, A1001)
 * - 5 digits (e.g. A10000)
 * - 6 digits (e.g. A100000)
 * - Variations: "A1111", "a1111", "A 1111", "a 1111", "A-1111"
 * - Bengali phonetics: "এ১১১১", "এ ১১১১", "এই ১১১১", "এ 1111", "A১১১১"
 */
export interface ExtractedCodeResult {
  rawMatchedText: string;
  normalizedCode: string; // e.g. "A1111"
}

export const extractSpokenCustomerCode = (
  text: string,
  existingCustomers: Customer[] = []
): ExtractedCodeResult | null => {
  // 1. First check if any existing customer's code matches directly
  for (const c of existingCustomers) {
    if (!c.code) continue;
    const cleanCode = c.code.trim().toUpperCase();
    const letter = cleanCode.charAt(0);
    const numPart = cleanCode.substring(1);
    const banglaNumPart = numPart
      .split('')
      .map(d => Object.keys(banglaDigits).find(k => banglaDigits[k] === d) || d)
      .join('');

    // Regex for this exact code with optional spaces/hyphen and English or Bengali letter/digits
    const exactRegex = new RegExp(
      `(?:\\b|\\s|^)(?:${letter}|[এএই])\\s*[-]?\\s*(?:${numPart}|${banglaNumPart})(?:\\b|\\s|$)`,
      'i'
    );
    const match = text.match(exactRegex);
    if (match) {
      return {
        rawMatchedText: match[0].trim(),
        normalizedCode: cleanCode,
      };
    }
  }

  // 2. Generic match: 1 letter (A-Z or এ/এই) + 4 to 6 digits (either Bengali or English)
  const convertedText = convertBanglaToEnglishDigits(text);
  // Match letter + 4-6 digits: A1111, a 1111, এ১১১১, etc.
  const genericMatch = convertedText.match(/(?:^|\s|\b)([A-Za-z]|এ|এই)\s*[-]?\s*(\d{4,6})(?:\b|\s|$)/i);
  if (genericMatch) {
    const rawMatched = genericMatch[0].trim();
    const letterPart = /[A-Za-z]/.test(genericMatch[1]) ? genericMatch[1].toUpperCase() : 'A';
    const numPart = genericMatch[2];
    return {
      rawMatchedText: rawMatched,
      normalizedCode: `${letterPart}${numPart}`,
    };
  }

  return null;
};

export const parseVoiceCommand = (
  text: string,
  existingCustomers: Customer[]
): VoiceParseResult => {
  const normalized = text.trim();

  // 1. Check for customer unique code (e.g. A1111, A1001, A10000, etc.)
  const codeExtraction = extractSpokenCustomerCode(normalized, existingCustomers);
  const detectedCode = codeExtraction ? codeExtraction.normalizedCode : undefined;

  // If a code was found, strip the code from text so its digits (e.g. 1111) don't get misread as the money amount
  let textWithoutCode = normalized;
  if (codeExtraction) {
    textWithoutCode = normalized.replace(codeExtraction.rawMatchedText, ' ').trim();
  }

  // 2. Parse Amount from remaining text
  const amount = parseBanglaAmount(textWithoutCode);

  // 3. Intent classification
  let type: TransactionType = 'credit_given';
  let typeLabel = 'বাকি দিলাম';

  if (
    normalized.includes('টাকা দিল') ||
    normalized.includes('জমা দিল') ||
    normalized.includes('পরিশোধ') ||
    normalized.includes('টাকা পেলাম') ||
    normalized.includes('দিল') ||
    normalized.includes('পেল')
  ) {
    type = 'payment_received';
    typeLabel = 'টাকা পেলাম (জমা)';
  } else if (
    normalized.includes('বিক্রি') ||
    normalized.includes('নগদ')
  ) {
    type = 'sale';
    typeLabel = 'নগদ বিক্রি';
  } else if (
    normalized.includes('খরচ') ||
    normalized.includes('বিল')
  ) {
    type = 'expense';
    typeLabel = 'দোকানের খরচ';
  } else {
    // Default বাকি নিল / বাকি দিলাম
    type = 'credit_given';
    typeLabel = 'বাকি দিলাম';
  }

  // 4. Customer Matching: Support ID-only, ID + Name combination, and Name-only
  let matchedCustomer: Customer | undefined;
  let customerName = '';
  let customerCode = detectedCode;

  // A. Check if customer matches by code
  let customerByCode: Customer | undefined;
  if (detectedCode) {
    customerByCode = existingCustomers.find(
      c => c.code && c.code.toUpperCase() === detectedCode.toUpperCase()
    );
  }

  // B. Check if customer matches by name (in text or textWithoutCode)
  let customerByName: Customer | undefined;
  const searchTarget = textWithoutCode.toLowerCase();
  for (const c of existingCustomers) {
    const cleanCName = c.name.toLowerCase().trim();
    if (searchTarget.includes(cleanCName)) {
      customerByName = c;
      break;
    }
    // Match first word of customer name (e.g. "রাজু" in "রাজু আহমেদ" or "রহিম" in "রহিম মিয়া")
    const firstWord = cleanCName.split(/\s+/)[0];
    if (firstWord.length >= 2 && searchTarget.includes(firstWord)) {
      customerByName = c;
      break;
    }
  }

  // C. Intelligently correlate Code + Name:
  // "যদি কখনো উইনিক নাম্বার শেষ হয় তো 5 সংখ্যার করবে সেটা শেষ হলে 6 সংখ্যার করবে।
  //  ইউনিক নাম্বার না বলে শুধু নাম বললেও হবে।
  //  আবার A1111 এর পরে যদি নাম বলি মানে রাজু A1111 তো মিলিয়ে দেখবে কার নাম বলা হচ্ছে"
  if (customerByCode && customerByName) {
    if (customerByCode.id === customerByName.id) {
      // Perfect match: both code and name point to the exact same customer!
      matchedCustomer = customerByCode;
      customerName = customerByCode.name;
      customerCode = customerByCode.code;
    } else {
      // User said a code and a name that might differ; check if customerByCode's name matches spoken words
      const codeCustFirstWord = customerByCode.name.toLowerCase().split(/\s+/)[0];
      if (searchTarget.includes(codeCustFirstWord)) {
        matchedCustomer = customerByCode;
        customerName = customerByCode.name;
        customerCode = customerByCode.code;
      } else {
        // Name was explicitly spoken for another customer; prefer spoken name, but keep customer code if appropriate
        matchedCustomer = customerByName;
        customerName = customerByName.name;
        customerCode = customerByName.code || detectedCode;
      }
    }
  } else if (customerByCode) {
    // Only code was given or matched (e.g. "A1111 কে ৫০০ বাকি")
    matchedCustomer = customerByCode;
    customerName = customerByCode.name;
    customerCode = customerByCode.code;
  } else if (customerByName) {
    // Only name was given or matched without code (e.g. "রাজু ৫০০ বাকি")
    matchedCustomer = customerByName;
    customerName = customerByName.name;
    customerCode = customerByName.code;
  } else if (detectedCode) {
    // Code was spoken, but not yet in database (e.g. new customer with code)
    customerCode = detectedCode;
    // Try to extract name from textWithoutCode
    const cleanedWords = textWithoutCode
      .replace(/[০-৯\d]+/g, '')
      .replace(/টাকা|বাকি|ধার|জমা|দিল|নিল|পেল|পরিশোধ|কে/g, '')
      .trim()
      .split(/\s+/);
    if (cleanedWords.length > 0 && cleanedWords[0]) {
      customerName = cleanedWords[0];
    } else {
      customerName = `কাস্টমার (${detectedCode})`;
    }
  } else {
    // Neither code nor existing customer matched: extract first 1-2 words from speech
    const words = normalized
      .replace(/[০-৯\d]+/g, '')
      .replace(/টাকা|বাকি|ধার|জমা|দিল|নিল|পেল|পরিশোধ|কে/g, '')
      .trim()
      .split(/\s+/);
    if (words.length > 0 && words[0]) {
      customerName = words[0];
      if (words.length > 1 && words[1].length > 1) {
        customerName += ' ' + words[1];
      }
    } else {
      customerName = 'অজ্ঞাত কাস্টমার';
    }
  }

  return {
    rawText: normalized,
    customerName,
    customerCode,
    matchedCustomerId: matchedCustomer?.id,
    amount: amount || 0,
    type,
    typeLabel,
    description: `ভয়েস এন্ট্রি: "${normalized}"`,
    confidence: (amount > 0 && (customerName || customerCode)) ? (customerByCode && customerByName ? 0.99 : 0.95) : 0.6,
  };
};

export class BanglaSpeechRecognizer {
  private recognition: any = null;
  public isSupported = false;
  private currentTranscript = '';

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.isSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'bn-BD';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: any) => void,
    onEnd: (lastTranscript: string) => void
  ) {
    if (!this.recognition) {
      onError(new Error('ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট করে না'));
      return;
    }

    this.currentTranscript = '';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = (finalTranscript || interimTranscript).trim();
      if (text) {
        this.currentTranscript = text;
        onResult(text, Boolean(finalTranscript));
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        onError(event.error);
      }
    };

    this.recognition.onend = () => {
      onEnd(this.currentTranscript);
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Speech recognition error starting:', e);
    }
  }

  stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }
}

/**
 * Reads text out loud using browser SpeechSynthesis (TTS)
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
};

export const speakBanglaText = (
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): boolean => {
  if (!isSpeechSynthesisSupported()) {
    if (onError) onError(new Error('ব্রাউজারে টেক্সট-টু-স্পিচ সুবিধা নেই'));
    return false;
  }

  try {
    stopSpeaking();

    const cleanText = text.trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.92; // Natural, clear speaking rate
    utterance.pitch = 1.0;

    // Detect if Bengali voice is installed in device
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang === 'bn-BD' || v.lang === 'bn_BD' || v.lang.startsWith('bn'));
    if (bnVoice) {
      utterance.voice = bnVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      if (onEnd) onEnd();
      if (onError) onError(e);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Failed to synthesize speech:', err);
    if (onEnd) onEnd();
    if (onError) onError(err);
    return false;
  }
};

