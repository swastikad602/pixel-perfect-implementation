import type { Lang } from "./types";

type Dict = Record<string, { en: string; bn: string }>;

export const STRINGS: Dict = {
  appName: { en: "RECONNECT", bn: "রিকানেক্ট" },
  play: { en: "Play", bn: "খেলা" },
  myRoutine: { en: "My Routine", bn: "আমার রুটিন" },
  myPeople: { en: "My People", bn: "আমার মানুষ" },
  help: { en: "Help", bn: "সাহায্য" },
  hello: { en: "Hello", bn: "নমস্কার" },
  chooseActivity: { en: "Choose an activity", bn: "একটি কার্যকলাপ বেছে নিন" },
  chooseGame: { en: "Choose a game", bn: "একটি খেলা বেছে নিন" },
  back: { en: "Back", bn: "পিছনে" },
  done: { en: "Done", bn: "হয়ে গেছে" },
  remindLater: { en: "Remind me later", bn: "পরে মনে করিয়ে দিন" },
  needHelp: { en: "I need help", bn: "আমার সাহায্য দরকার" },
  wellDone: {
    en: "Well done! Tomorrow's activity will be adjusted to your comfort level",
    bn: "খুব ভালো! আগামীকালের কার্যকলাপ আপনার স্বাচ্ছন্দ্য অনুযায়ী সাজানো হবে",
  },
  memoryInstruction: { en: "Find the two pictures that match", bn: "মিল আছে এমন দুটি ছবি খুঁজুন" },
  attentionInstruction: { en: "Tap this object", bn: "এই জিনিসটি স্পর্শ করুন" },
  patternInstruction: { en: "What comes next?", bn: "এরপর কী আসবে?" },
  executiveInstruction: { en: "Put the steps in order", bn: "ধাপগুলি ক্রমানুসারে সাজান" },
  recallWatch: { en: "Look carefully at these pictures", bn: "এই ছবিগুলি মন দিয়ে দেখুন" },
  recallPick: { en: "Tap every picture you saw", bn: "আপনি যে ছবিগুলি দেখেছেন সেগুলি স্পর্শ করুন" },
  recallResult: { en: "You remembered {n} of 5!", bn: "আপনি ৫টির মধ্যে {n}টি মনে রেখেছেন!" },
  spotWatch: { en: "Watch the screen", bn: "পর্দার দিকে তাকিয়ে থাকুন" },
  sawIt: { en: "I saw it!", bn: "আমি দেখেছি!" },
  spotResult: { en: "Your reaction time is getting sharper!", bn: "আপনার প্রতিক্রিয়া আরও ক্ষুরধার হচ্ছে!" },
  helpText: {
    en: "Help is on the way. Your caregiver has been notified.",
    bn: "সাহায্য আসছে। আপনার পরিচর্যাকারীকে জানানো হয়েছে।",
  },
  callCaregiver: { en: "Tell my caregiver I need help", bn: "পরিচর্যাকারীকে জানান আমার সাহায্য দরকার" },
  todayReminders: { en: "Today", bn: "আজ" },
  exit: { en: "Exit", bn: "প্রস্থান" },
  playAgain: { en: "Play again", bn: "আবার খেলুন" },
  orientationQuestion: { en: "Do you know what day it is today?", bn: "আজ কী বার জানেন?" },
  orientationReveal: { en: "Today is {day}, {date}!", bn: "আজ {day}, {date}!" },
  companion: { en: "Talk to a Friend", bn: "বন্ধুর সাথে কথা" },
  holdToTalk: { en: "Hold to talk", bn: "চেপে ধরে কথা বলুন" },
  holdHint: { en: "Hold the button and speak", bn: "বোতামটি চেপে ধরে কথা বলুন" },
  tapToStop: { en: "Tap again when you're done", bn: "শেষ হলে আবার স্পর্শ করুন" },
  listening: { en: "I'm listening…", bn: "আমি শুনছি…" },
  thinking: { en: "Just a moment…", bn: "একটু দাঁড়ান…" },
  speakingNow: { en: "Speaking…", bn: "বলছি…" },
  playFavorite: { en: "Play something I love", bn: "আমার প্রিয় কিছু শোনাও" },
  chooseFavorite: { en: "Which one would you like?", bn: "কোনটা শুনবেন?" },
  noFavorites: {
    en: "Your caregiver can add your favourite songs here.",
    bn: "আপনার পরিচর্যাকারী এখানে আপনার প্রিয় গান যোগ করতে পারেন।",
  },
  stop: { en: "Stop", bn: "থামান" },
  companionGreeting: {
    en: "Hello {name}! I'm your friendly companion. How are you feeling today?",
    bn: "নমস্কার {name}! আমি আপনার সঙ্গী বন্ধু। আজ আপনি কেমন আছেন?",
  },
  didNotHear: {
    en: "I didn't quite hear that. Could you say it again?",
    bn: "আমি ঠিক শুনতে পাইনি। আরেকবার বলবেন?",
  },
  micBlocked: {
    en: "The microphone is off. A helper can type below.",
    bn: "মাইক্রোফোন বন্ধ আছে। একজন সাহায্যকারী নিচে লিখতে পারেন।",
  },
  consentTitle: { en: "Before we talk", bn: "কথা বলার আগে" },
  consentText: {
    en: "When you hold the button, this friend listens to your voice. Your words are kept safely for your caregiver and your doctor only, so they can help if you feel low. Is that okay?",
    bn: "বোতাম চেপে ধরলে এই বন্ধু আপনার কথা শোনে। আপনার কথাগুলি শুধু আপনার পরিচর্যাকারী ও ডাক্তারের জন্য নিরাপদে রাখা হয়, যাতে মন খারাপ হলে তাঁরা পাশে থাকতে পারেন। এতে কি আপনার সম্মতি আছে?",
  },
  consentYes: { en: "Yes, that's okay", bn: "হ্যাঁ, ঠিক আছে" },
  consentNo: { en: "Not now", bn: "এখন না" },
  helperType: { en: "Helper: type instead", bn: "সাহায্যকারী: লিখে পাঠান" },
  send: { en: "Send", bn: "পাঠান" },
};

export const DAY_NAMES: Record<Lang, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  bn: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
};

export const MONTH_NAMES: Record<Lang, string[]> = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  bn: [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
  ],
};

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function localizeNumber(n: number, lang: Lang): string {
  const s = String(n);
  return lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!) : s;
}

export function t(key: string, lang: Lang): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

/** Same as t(), with {placeholder} substitution. */
export function tf(key: string, lang: Lang, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{${k}}`, v),
    t(key, lang),
  );
}
