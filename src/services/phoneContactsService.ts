/**
 * Phone Contacts Service
 * Integrates native Mobile Contact Picker API (Chrome Android / PWA)
 * and intelligent contact text/vCard parsers for DSRs.
 */

export interface PickedContactResult {
  name: string;
  phone: string;
  address?: string;
  source: 'native_contact_picker' | 'vcard_file' | 'pasted_text' | 'manual';
}

/**
 * Checks if the browser natively supports the Web Contact Picker API
 */
export const isNativeContactPickerSupported = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    'ContactsManager' in window &&
    typeof (navigator as any).contacts?.select === 'function'
  );
};

/**
 * Normalizes phone numbers: converts Bangla numerals to English,
 * removes spaces, hyphens, parentheses, and standardizes BD prefixes (+880 -> 0)
 */
export const normalizePhoneNumber = (raw: string): string => {
  if (!raw) return '';

  // 1. Convert Bangla digits to English
  const banglaToEng: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  let sanitized = raw.replace(/[০-৯]/g, d => banglaToEng[d] || d);

  // 2. Remove whitespace, hyphens, brackets, dots
  sanitized = sanitized.replace(/[\s\-\(\)\.\,\/]/g, '').trim();

  // 3. Handle standard BD prefix (+880 or 880)
  if (sanitized.startsWith('+880')) {
    sanitized = '0' + sanitized.substring(4);
  } else if (sanitized.startsWith('880') && sanitized.length >= 13) {
    sanitized = '0' + sanitized.substring(3);
  } else if (sanitized.startsWith('+88')) {
    sanitized = sanitized.substring(3);
  }

  // If starts with 17..., prepend 0
  if (sanitized.length === 10 && sanitized.startsWith('1')) {
    sanitized = '0' + sanitized;
  }

  return sanitized;
};

/**
 * Validates whether string is a plausible Bangladeshi phone number
 */
export const isValidBdPhoneNumber = (phone: string): boolean => {
  const norm = normalizePhoneNumber(phone);
  return /^01[3-9]\d{8}$/.test(norm);
};

/**
 * Invokes native Phone Contact Picker dialog (Android/PWA)
 */
export const pickSingleContactFromPhone = async (): Promise<PickedContactResult | null> => {
  if (!isNativeContactPickerSupported()) {
    throw new Error('NOT_SUPPORTED');
  }

  try {
    const supportedProps: string[] = await (navigator as any).contacts.getProperties();
    const propsToRequest = ['name', 'tel'].filter(p => supportedProps.includes(p));

    if (propsToRequest.length === 0) {
      propsToRequest.push('name', 'tel');
    }

    const contacts = await (navigator as any).contacts.select(propsToRequest, {
      multiple: false,
    });

    if (!contacts || contacts.length === 0) {
      return null;
    }

    const first = contacts[0];
    const name = Array.isArray(first.name) && first.name.length > 0 ? first.name[0] : (first.name || '');
    const rawTel = Array.isArray(first.tel) && first.tel.length > 0 ? first.tel[0] : (first.tel || '');
    
    // Check address if available
    let address = '';
    if (first.address && Array.isArray(first.address) && first.address.length > 0) {
      const addrObj = first.address[0];
      if (typeof addrObj === 'string') {
        address = addrObj;
      } else if (typeof addrObj === 'object') {
        address = [addrObj.addressLine, addrObj.city].filter(Boolean).join(', ');
      }
    }

    return {
      name: (name || '').trim(),
      phone: normalizePhoneNumber(rawTel),
      address: address.trim(),
      source: 'native_contact_picker',
    };
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TypeError' && err.message?.includes('cancel')) {
      // User cancelled picker
      return null;
    }
    throw err;
  }
};

/**
 * Parses smart text pasted by DSR (e.g. from WhatsApp, SMS, or Call Log)
 * Example inputs:
 * "মো: রহিম স্টোর 01712-345678 চকবাজার"
 * "01819223344 - ভাই ভাই এন্টারপ্রাইজ"
 * "+8801912345678 Kalam"
 */
export const parseSmartContactText = (input: string): PickedContactResult | null => {
  if (!input || !input.trim()) return null;

  // Regex to match BD phone numbers with possible spaces/dashes
  const phonePattern = /(?:\+?880\s?|880\s?|0)?1[3-9](?:[\s\-]?[0-9]){8}/;
  const match = input.match(phonePattern);

  if (match) {
    const rawPhone = match[0];
    const cleanedPhone = normalizePhoneNumber(rawPhone);

    // Extract name by removing the phone number and common labels
    let namePart = input
      .replace(rawPhone, '')
      .replace(/^(নাম|Name|মোবাইল|ফোন|Phone|Tel|Mobile|Contact)[\s:\-—]+/i, '')
      .replace(/[\s:\-—]+(নাম|Name|মোবাইল|ফোন|Phone|Tel|Mobile|Contact)[\s:\-—]+/i, '')
      .trim();

    // Clean up residual dashes, commas, quotes
    namePart = namePart.replace(/^[\-—:,."'\s]+|[\-—:,."'\s]+$/g, '').trim();

    return {
      name: namePart || 'নতুন কাস্টমার',
      phone: cleanedPhone,
      source: 'pasted_text',
    };
  }

  // If only phone number was pasted
  const cleanAttempt = normalizePhoneNumber(input);
  if (isValidBdPhoneNumber(cleanAttempt)) {
    return {
      name: '',
      phone: cleanAttempt,
      source: 'pasted_text',
    };
  }

  return null;
};

/**
 * Parses a standard vCard (.vcf) file string exported from Android / iOS contacts
 */
export const parseVCardString = (vcardContent: string): PickedContactResult[] => {
  const results: PickedContactResult[] = [];
  if (!vcardContent) return results;

  const cards = vcardContent.split(/BEGIN:VCARD/i);

  for (const card of cards) {
    if (!card.trim()) continue;

    let name = '';
    let phone = '';
    let address = '';

    const lines = card.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Full Name
      if (/^FN(;.*)?:/i.test(line)) {
        name = line.replace(/^FN(;.*)?:/i, '').trim();
      } else if (!name && /^N(;.*)?:/i.test(line)) {
        const parts = line.replace(/^N(;.*)?:/i, '').split(';');
        name = [parts[1], parts[0]].filter(Boolean).join(' ').trim();
      }

      // Telephone
      if (/^TEL(;.*)?:/i.test(line)) {
        const rawTel = line.replace(/^TEL(;.*)?:/i, '').trim();
        const norm = normalizePhoneNumber(rawTel);
        if (norm && !phone) {
          phone = norm;
        }
      }

      // Address
      if (/^ADR(;.*)?:/i.test(line)) {
        const parts = line.replace(/^ADR(;.*)?:/i, '').split(';');
        address = parts.filter(Boolean).join(', ').trim();
      }
    }

    if (phone || name) {
      results.push({
        name: name || 'অজ্ঞাত কাস্টমার',
        phone: phone || '',
        address: address || '',
        source: 'vcard_file',
      });
    }
  }

  return results;
};
