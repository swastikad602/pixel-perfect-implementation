/**
 * Rule-based assistant. Single entry point so a real LLM call can replace the
 * body later without touching any UI code.
 */
export async function getAssistantReply(message: string): Promise<string> {
  const q = message.toLowerCase();

  const medical = ["dose", "dosage", "medicine for", "diagnos", "symptom", "treat", "prescri", "alzheimer cure", "disease"];
  if (medical.some((k) => q.includes(k))) {
    return "I can't help with medical questions. Please consult your doctor for anything about diagnosis, medication or treatment.";
  }

  if (q.includes("reminder")) {
    return "Reminders have a title, a time and a category. The elder sees Done, Remind me later, or I need help. If nobody responds within the response window (90 seconds by default), the reminder is marked missed and shows up on your dashboard.";
  }
  if (q.includes("needs review") || q.includes("review")) {
    return "\"Needs review\" appears when an elder's last few activity sessions average more than 15% below their longer-term rolling average. It's an engagement signal, not a diagnosis.";
  }
  if (q.includes("memory card") || q.includes("family")) {
    return "Open the Caregiver dashboard, choose an elder, then use Add Family Memory Card. Add a name, relationship and a short note — it appears instantly in the elder's My People screen and can be read aloud.";
  }
  if (q.includes("level") || q.includes("adaptive") || q.includes("difficulty")) {
    return "After each activity we compute accuracy and speed. 80% or higher and quick moves the next session to Level 2; under 50% or slow moves it back to Level 1. The elder never sees a score.";
  }
  if (q.includes("offline")) {
    return "Everything is stored on the device, so activities and reminders keep working with no connection. The indicator at the top shows \"Offline — saved locally\" until the connection returns.";
  }
  if (q.includes("add elder") || q.includes("new elder")) {
    return "Use Add Elder on the Caregiver dashboard. You set a name and a 4-digit PIN — that PIN is what the elder uses to sign in.";
  }
  if (q.includes("hello") || q.includes("hi") || q.includes("help")) {
    return "Hello! Ask me about reminders, the \"needs review\" flag, adding family memory cards, activity levels, or offline use.";
  }
  return "I'm not sure about that one. I can explain reminders, the \"needs review\" flag, family memory cards, activity levels and offline use.";
}
