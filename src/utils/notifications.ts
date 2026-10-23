// In-app notifications are written by the server in English. In the Bangla version of the site the known
// ones are shown in Bangla (the names, hospitals and numbers inside them stay exactly as they are).
// Anything not recognised is shown unchanged.
type Rule = [RegExp, (m: RegExpMatchArray) => string];

const TITLES: Rule[] = [
  [/^Possible match: (.+) needed \((.+)\)$/, m => `সম্ভাব্য মিল: ${m[1]} রক্ত দরকার (${m[2] === 'Critical' ? 'অতি জরুরি' : m[2] === 'Urgent' ? 'জরুরি' : 'সাধারণ'})`],
  [/^(.+) Responded!$/, m => `${m[1]} সাড়া দিয়েছেন!`],
  [/^(.+) says they donated$/, m => `${m[1]} বলছেন তিনি রক্ত দিয়েছেন`],
  [/^Donation confirmed$/, () => 'রক্তদান নিশ্চিত হয়েছে'],
  [/^Donation marked as donated$/, () => 'রক্তদান “দেওয়া হয়েছে” হিসেবে ধরা হয়েছে'],
  [/^You were booked$/, () => 'আপনাকে বুক করা হয়েছে'],
  [/^A requester wants to reach you$/, () => 'একজন অনুরোধকারী আপনার সাথে যোগাযোগ করতে চান'],
  [/^A donation record was cancelled$/, () => 'একটি রক্তদানের রেকর্ড বাতিল হয়েছে'],
];

const MESSAGES: Rule[] = [
  [/^A patient at (.+) urgently needs (\d+) unit\(s\) of (.+)\.$/, m => `${m[1]}-এ একজন রোগীর জরুরি ভিত্তিতে ${m[3]} রক্ত ${m[2]} ব্যাগ দরকার।`],
  [/^Donor (.+) is ready to donate for (.+) at (.+)\.$/, m => `ডোনার ${m[1]}, ${m[3]}-এ ${m[2]}-এর জন্য রক্ত দিতে প্রস্তুত।`],
  [/^(.+) \((.+)\) says they gave blood at (.+)\. Please confirm it\. If you do not answer within (\d+) hours it will be marked as donated automatically\.$/,
    m => `${m[1]} (${m[2]}) জানিয়েছেন তিনি ${m[3]}-এ রক্ত দিয়েছেন। অনুগ্রহ করে নিশ্চিত করুন। ${m[4]} ঘণ্টার মধ্যে সাড়া না দিলে এটি নিজে থেকেই “রক্ত দেওয়া হয়েছে” ধরা হবে।`],
  [/^Your donation of (\d+) unit\(s\) at (.+) has been confirmed by the person who requested blood\. Thank you for helping!$/,
    m => `${m[2]}-এ আপনার ${m[1]} ব্যাগ রক্তদান, যিনি রক্ত চেয়েছিলেন তিনি নিশ্চিত করেছেন। সাহায্য করার জন্য ধন্যবাদ!`],
  [/^Your donation for the request at (.+) was marked as donated automatically, because the requester did not answer within (\d+) hours\. Thank you for helping!$/,
    m => `${m[1]}-এর অনুরোধে আপনার রক্তদান নিজে থেকেই নিশ্চিত ধরা হয়েছে, কারণ অনুরোধকারী ${m[2]} ঘণ্টার মধ্যে সাড়া দেননি। সাহায্য করার জন্য ধন্যবাদ!`],
  [/^(.+) said they donated and you did not answer within (\d+) hours, so it was marked as donated\. If this is wrong, please contact the LIFORA administrators\.$/,
    m => `${m[1]} জানিয়েছিলেন তিনি রক্ত দিয়েছেন এবং আপনি ${m[2]} ঘণ্টার মধ্যে সাড়া দেননি, তাই এটি “রক্ত দেওয়া হয়েছে” ধরা হয়েছে। ভুল হলে লাইফোরার অ্যাডমিনের সাথে যোগাযোগ করুন।`],
  [/^The family of (.+) chose you as the donor at (.+)\. Please contact them and go to the hospital\.$/,
    m => `${m[1]}-এর পরিবার ${m[2]}-এ আপনাকে ডোনার হিসেবে বেছে নিয়েছে। অনুগ্রহ করে তাঁদের সাথে যোগাযোগ করে হাসপাতালে যান।`],
  [/^An administrator cancelled the donation record at (.+)\. If you think this is a mistake, please contact LIFORA\.$/,
    m => `অ্যাডমিন ${m[1]}-এর রক্তদানের রেকর্ডটি বাতিল করেছেন। ভুল মনে হলে লাইফোরার সাথে যোগাযোগ করুন।`],
];

function apply(rules: Rule[], text: string): string {
  for (const [re, fn] of rules) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return text;
}

export function localizeNotification(n: { title: string; message: string }, language: string): { title: string; message: string } {
  if (language !== 'bn') return n;
  return { title: apply(TITLES, n.title), message: apply(MESSAGES, n.message) };
}
