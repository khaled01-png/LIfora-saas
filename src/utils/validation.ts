// Shared form rules. The server enforces the same rules again (backend/app/schemas/common.py).
// Form messages follow the language the visitor chose (English or Bangla).
const msg = (en: string, bn: string): string => {
  try { return localStorage.getItem('lifora-lang') === 'bn' ? bn : en; } catch { return en; }
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}[0-9]$/;

// ---- keyboard-mash detection ("hsjsj", "asdfgh"): mirrors backend/app/schemas/common.py ----
const MASH = ['asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop', 'zxcv', 'xcvb', 'cvbn', 'vbnm', 'qaz', 'wsx', 'edc', 'rfv'];

function wordLooksReal(word: string): boolean {
  const letters = (word.match(/\p{L}/gu) || []).join('');
  if (!letters) return true;
  if ([...letters].some(ch => ch.charCodeAt(0) > 0x24f)) return true; // Bangla and other scripts
  const low = letters.toLowerCase();
  if (low.length >= 4 && !/[aeiouy]/.test(low)) return false;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(low)) return false;
  if (/(.)\1{3,}/.test(low)) return false;
  if (low.length >= 4 && MASH.some(m => low.includes(m))) return false;
  return true;
}

export function validateName(value: string): string | null {
  const v = value.trim();
  const letters = (v.match(/\p{L}/gu) || []).length;
  if (v.length < 2 || letters < 2) return msg('Please enter your real full name.', 'আপনার আসল পুরো নাম লিখুন।');
  if (/[0-9@<>/\\]/.test(v)) return msg('A name cannot contain numbers or symbols like @ < > /.', 'নামে সংখ্যা বা @ < > / এর মতো চিহ্ন থাকতে পারবে না।');
  const words = v.split(/[\s.\-']+/).filter(Boolean);
  const twoLetterWord = words.some(w => (w.match(/\p{L}/gu) || []).length >= 2);
  if (!twoLetterWord || !words.every(wordLooksReal)) return msg('That does not look like a real name. Please check the spelling.', 'এটি আসল নামের মতো দেখাচ্ছে না। বানান দেখে নিন।');
  return null;
}

export function validateHospital(value: string): string | null {
  const v = value.trim();
  const letters = (v.match(/\p{L}/gu) || []).length;
  if (letters < 3 || /[<>]/.test(v)) return msg('Please enter the full hospital name.', 'হাসপাতালের পুরো নাম লিখুন।');
  if (!v.split(/[\s.,\-()/&']+/).filter(Boolean).every(wordLooksReal)) return msg('That does not look like a real hospital name. Please check the spelling.', 'এটি আসল হাসপাতালের নামের মতো দেখাচ্ছে না। বানান দেখে নিন।');
  return null;
}

export const DEADLINE_OPTIONS = ['Within 2 hours', 'Within 6 hours', 'Within 12 hours', 'Within 24 hours', 'Within 3 days', 'Within 7 days'];

export function validateEmail(value: string): string | null {
  return EMAIL_RE.test(value.trim()) ? null : msg('Please enter a valid email address.', 'সঠিক ইমেইল ঠিকানা লিখুন।');
}

const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;

/** Bangladesh mobile numbers only (01XXXXXXXXX or +8801XXXXXXXXX). Returns an error message or null. */
export function validatePhone(value: string, required = true): string | null {
  const v = value.trim();
  if (!v) return required ? msg('Please enter a phone number.', 'ফোন নম্বর লিখুন।') : null;
  const m = v.replace(/[\s\-()]/g, '').match(BD_MOBILE);
  if (!m) return msg('Please enter a valid Bangladesh mobile number, for example 01711-000111.', 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন, যেমন 01711-000111।');
  if (new Set(m[1].slice(1)).size <= 2) return msg('Please enter a real phone number.', 'আসল ফোন নম্বর লিখুন।');
  return null;
}

/** "01711000111" -> "+880 1711-000111" (same format the server stores). */
export function normalizePhone(value: string): string {
  const m = value.trim().replace(/[\s\-()]/g, '').match(BD_MOBILE);
  if (!m) return value.trim();
  const n = m[1].slice(1);
  return `+880 ${n.slice(0, 4)}-${n.slice(4)}`;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return msg('Please choose a password with at least 8 characters.', 'কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।');
  if (/^\s+$/.test(value)) return msg('Password cannot be only spaces.', 'পাসওয়ার্ড শুধু ফাঁকা জায়গা হতে পারবে না।');
  return null;
}

export function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export interface OnboardingInput {
  role: string;
  bloodGroup: string;
  age: number;
  city: string;
  location: string;
  radiusKm: number;
  phone: string;
}

/** Profile step after e-mail verification. The server applies the same rules. */
export function validateOnboarding(v: OnboardingInput): string | null {
  if (v.role !== 'donor' && v.role !== 'requester') return 'Please choose Donor or Requester.';
  if (!BLOOD_GROUPS.includes(v.bloodGroup)) return 'Please choose a blood group.';
  if (!Number.isInteger(v.age) || v.age < 16 || v.age > 100) return 'Please enter a valid age.';
  if (v.role === 'donor' && (v.age < 18 || v.age > 65)) return 'Donors must be between 18 and 65 years old.';
  if (v.city.trim().length < 2) return 'Please enter your city.';
  if (v.location.trim().length < 2) return 'Please enter your area / location.';
  if (!Number.isFinite(v.radiusKm) || v.radiusKm < 1 || v.radiusKm > 200) return 'Distance must be between 1 and 200 km.';
  return validatePhone(v.phone, true);
}
