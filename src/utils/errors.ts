// Messages that come from the server are written in English. This shows the common ones in Bangla
// when the visitor uses the Bangla version of the site. Anything not listed is shown as it is.
const BN: Array<[RegExp, string]> = [
  [/Cannot reach the (LIFORA )?server/i, 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।'],
  [/server returned an unexpected response/i, 'সার্ভার থেকে অপ্রত্যাশিত উত্তর এসেছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'],
  [/Invalid email address or password/i, 'ইমেইল ঠিকানা বা পাসওয়ার্ড ভুল।'],
  [/verify your email address first/i, 'আগে আপনার ইমেইল যাচাই করুন। আপনাকে পাঠানো ৬ সংখ্যার কোডটি দিন।'],
  [/already exists/i, 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে।'],
  [/code is invalid or has expired/i, 'কোডটি ভুল অথবা মেয়াদ শেষ। নতুন কোড চেয়ে আবার চেষ্টা করুন।'],
  [/wait a minute before asking for another/i, 'একটু আগেই একটি কোড পাঠানো হয়েছে। নতুন কোড চাইতে এক মিনিট অপেক্ষা করুন।'],
  [/Rate limit exceeded/i, 'অনেক বেশি চেষ্টা হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।'],
  [/session has ended|no longer exists|Not authenticated|Could not validate credentials/i, 'আপনার লগইনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।'],
  [/Please complete your profile first/i, 'আগে আপনার প্রোফাইল সম্পূর্ণ করুন।'],
  [/only for (.+) accounts/i, 'এই সুবিধা শুধু নির্দিষ্ট ধরনের অ্যাকাউন্টের জন্য।'],
  [/Administrator privileges required/i, 'এই কাজ শুধু অ্যাডমিন করতে পারেন।'],
  [/You have already (submitted a response|responded)/i, 'আপনি এই অনুরোধে আগেই সাড়া দিয়েছেন।'],
  [/Incompatible blood type/i, 'আপনার রক্তের গ্রুপ এই রোগীকে দেওয়া যায় না।'],
  [/cannot respond to your own/i, 'নিজের অনুরোধে নিজে সাড়া দেওয়া যায় না।'],
  [/availability is currently/i, 'আপনার অবস্থা এখন "Available" নয়, তাই সাড়া দেওয়া যাচ্ছে না।'],
  [/already (fulfilled|cancelled|expired)/i, 'এই অনুরোধ আগেই শেষ হয়ে গেছে।'],
  [/You already told us you donated/i, 'আপনি আগেই জানিয়েছেন যে রক্ত দিয়েছেন। অনুরোধকারীর নিশ্চিতকরণের অপেক্ষা চলছে।'],
  [/has not responded to this/i, 'এই ডোনার এই অনুরোধে সাড়া দেননি।'],
  [/at least (\d+) confirmed donations/i, 'Verified করতে কমপক্ষে ৫ বার নিশ্চিত রক্তদান লাগে।'],
  [/already have 3 open requests/i, 'আপনার ৩টি অনুরোধ এখনো খোলা আছে। একটি শেষ বা বাতিল হলে নতুন অনুরোধ দিন।'],
  [/already have an active request/i, 'এই রোগী, রক্তের গ্রুপ ও হাসপাতালের জন্য আপনার একটি অনুরোধ আগেই চালু আছে।'],
  [/request link is not valid/i, 'এই অনুরোধের লিংকটি সঠিক নয়।'],
  [/Blood request not found/i, 'রক্তের অনুরোধটি পাওয়া যায়নি।'],
  [/Donor not found/i, 'ডোনারকে পাওয়া যায়নি।'],
  [/e-?mail could not be sent/i, 'ইমেইল পাঠানো যায়নি (মেইল সার্ভার ঠিক নেই)।'],
];

export function localizeError(message: string): string {
  let lang = 'en';
  try { lang = localStorage.getItem('lifora-lang') || 'en'; } catch { /* private mode */ }
  if (lang !== 'bn') return message;
  const hit = BN.find(([re]) => re.test(message));
  return hit ? hit[1] : message;
}
