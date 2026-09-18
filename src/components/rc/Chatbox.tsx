import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button, Card, CardTitle, ChatBubble } from "./ui";
import { getDb } from "@/lib/db";
import { getAssistantReply } from "@/lib/chatbot";
import { useDexie } from "@/hooks/useDexie";
import { useApp } from "@/store/app";

export function Chatbox({ thread }: { thread: "caregiver" | "doctor" }) {
  const bump = useApp((s) => s.bump);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const messages = useDexie(
    async () => (await getDb().chat.where("thread").equals(thread).toArray()).sort((a, b) => a.ts - b.ts),
    [thread],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    await getDb().chat.add({ thread, from: "user", text: value, ts: Date.now() });
    bump();
    const reply = await getAssistantReply(value);
    await getDb().chat.add({ thread, from: "bot", text: reply, ts: Date.now() });
    bump();
  };

  return (
    <Card className="flex h-[420px] flex-col">
      <CardTitle>Assistant</CardTitle>
      <p className="mb-3 text-xs text-muted-foreground">
        Answers questions about using RECONNECT. It will not answer medical questions.
      </p>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {(messages ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Try: “How do reminders work?” or “What does needs review mean?”
          </p>
        )}
        {(messages ?? []).map((m) => (
          <ChatBubble key={m.id} from={m.from} text={m.text} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question"
          className="flex-1 rounded-xl border-2 border-input bg-background px-4 py-2.5 outline-none focus:border-primary"
        />
        <Button onClick={send} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
