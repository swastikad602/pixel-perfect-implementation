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
  helpText: {
    en: "Help is on the way. Your caregiver has been notified.",
    bn: "সাহায্য আসছে। আপনার পরিচর্যাকারীকে জানানো হয়েছে।",
  },
  callCaregiver: { en: "Tell my caregiver I need help", bn: "পরিচর্যাকারীকে জানান আমার সাহায্য দরকার" },
  todayReminders: { en: "Today", bn: "আজ" },
  exit: { en: "Exit", bn: "প্রস্থান" },
  playAgain: { en: "Play again", bn: "আবার খেলুন" },
};

export function t(key: string, lang: Lang): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}
