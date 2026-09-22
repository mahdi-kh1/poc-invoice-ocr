"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { CHAT_HISTORY, CLIENTS } from "../../../_lib/mock-data";
import type { ChatMessageRecord } from "../../../_lib/types";

let idCounter = 100;

export default function AssistantPage() {
  const [scope, setScope] = useState("firm");
  const [messages, setMessages] = useState<ChatMessageRecord[]>(CHAT_HISTORY);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    const userMsg: ChatMessageRecord = { id: String(idCounter++), role: "user", text: draft.trim() };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: String(idCounter++),
          role: "assistant",
          text: "This is a UI-only demo, so I can't run a real query yet — in the production app this answer would cite the actual transactions and documents behind it, scoped to what you've selected above.",
        },
      ]);
    }, 500);
  }

  return (
    <>
      <PageHeader
        title="AI assistant"
        description="Chat scoped to a firm, a client, or a single project — answers cite the underlying transaction or document, not a generic chatbot bolted on the side."
        actions={
          <select className="preview-select" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="firm">Whole firm</option>
            {CLIENTS.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        }
      />

      <div className="preview-card">
        <div className="preview-chat">
          {messages.map((m) => (
            <div key={m.id} className={`preview-chat-bubble ${m.role === "user" ? "preview-chat-bubble-user" : "preview-chat-bubble-assistant"}`}>
              {m.text}
              {m.citedDocument && <div className="preview-chat-cite">Source: {m.citedDocument}</div>}
            </div>
          ))}
        </div>
        <div className="preview-chat-input-row">
          <input
            className="preview-input"
            placeholder="Ask about transactions, documents, or a client…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn btn-primary" onClick={send}>Send</button>
        </div>
      </div>
    </>
  );
}
