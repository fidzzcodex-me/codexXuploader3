"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRobot,
  faPaperPlane,
  faCircleNotch,
  faTriangleExclamation,
  faTrashCan,
  faPlus,
  faCircleCheck,
  faUser,
  faLock,
  faGlobe,
  faPenToSquare,
  faBroom
} from "@fortawesome/free-solid-svg-icons";
import "@/lib/fontawesome";
import { useToast } from "@/components/ToastProvider";

type ProposedAction =
  | { type: "delete_repo"; repo: string }
  | { type: "create_repo"; repo: string; visibility: "public" | "private" }
  | { type: "delete_file"; repo: string; path: string }
  | { type: "change_visibility"; repo: string; visibility: "public" | "private" }
  | { type: "rename_repo"; repo: string; newName: string }
  | { type: "none" };

function describeAction(action: ProposedAction): { icon: any; label: string } {
  switch (action.type) {
    case "delete_repo":
      return { icon: faTrashCan, label: `Hapus repo "${action.repo}"` };
    case "create_repo":
      return {
        icon: faPlus,
        label: `Buat repo "${action.repo}" (${action.visibility})`
      };
    case "delete_file":
      return {
        icon: faTrashCan,
        label: `Hapus file "${action.path}" di repo "${action.repo}"`
      };
    case "change_visibility":
      return {
        icon: action.visibility === "private" ? faLock : faGlobe,
        label: `Ubah repo "${action.repo}" jadi ${action.visibility}`
      };
    case "rename_repo":
      return {
        icon: faPenToSquare,
        label: `Ganti nama repo "${action.repo}" jadi "${action.newName}"`
      };
    default:
      return { icon: faPlus, label: "Aksi tidak dikenali" };
  }
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  proposedAction?: ProposedAction;
  actionState?: "pending" | "confirmed" | "cancelled" | "error";
  actionResultMessage?: string;
}

const CHAT_STORAGE_KEY = "harbor_chat_messages";

function loadStoredMessages(): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch {
    return null;
  }
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "ai",
  text: "Halo! Saya bisa bantu jawab pertanyaan seputar repo kamu, atau usulkan aksi seperti membuat/menghapus repo — setiap aksi tetap butuh konfirmasi kamu dulu."
};

export default function ChatClient() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => loadStoredMessages() || [WELCOME_MESSAGE]
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "AI tidak merespons.");
        setLoading(false);
        return;
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "ai",
        text: data.reply,
        proposedAction: data.proposedAction,
        actionState:
          data.proposedAction?.type !== "none" ? "pending" : undefined
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setError("Koneksi ke server terputus.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(msgId: string, action: ProposedAction) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionState: "confirmed" } : m))
    );

    try {
      const res = await fetch("/api/ai/execute-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      });
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                actionState: data.ok ? "confirmed" : "error",
                actionResultMessage: data.ok ? data.message : data.error
              }
            : m
        )
      );
      showToast(
        data.ok ? data.message : data.error || "Aksi gagal.",
        data.ok ? "success" : "error"
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, actionState: "error", actionResultMessage: "Koneksi terputus." }
            : m
        )
      );
      showToast("Koneksi terputus.", "error");
    }
  }

  function cancelAction(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionState: "cancelled" } : m))
    );
  }

  function clearChat() {
    setMessages([WELCOME_MESSAGE]);
    try {
      window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col sm:h-[calc(100vh-260px)]">
      <div data-aos="fade-up" className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-soft">
            <FontAwesomeIcon icon={faRobot} className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink">AI Agent</h1>
            <p className="text-xs text-ink/45">
              1 sesi chat aktif selama token kamu login
            </p>
          </div>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink/50 shadow-card transition-colors hover:border-red-200 hover:text-red-500"
            title="Hapus riwayat chat"
          >
            <FontAwesomeIcon icon={faBroom} className="h-3 w-3" />
            <span className="hidden sm:inline">Bersihkan</span>
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-card ${
                m.role === "user"
                  ? "bg-ink text-white"
                  : "bg-primary-500 text-white"
              }`}
            >
              <FontAwesomeIcon
                icon={m.role === "user" ? faUser : faRobot}
                className="h-3.5 w-3.5"
              />
            </div>
            <div
              className={`min-w-0 max-w-[80%] px-4 py-3 text-sm leading-relaxed shadow-card ${
                m.role === "user"
                  ? "rounded-2xl rounded-tr-md bg-primary-500 text-white"
                  : "rounded-2xl rounded-tl-md bg-cloud text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {m.text}
              </p>

              {m.proposedAction && m.proposedAction.type !== "none" && (
                <div className="mt-3 rounded-xl border border-primary-200 bg-white p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary-700">
                    <FontAwesomeIcon
                      icon={describeAction(m.proposedAction).icon}
                      className="h-3 w-3"
                    />
                    Usulan aksi: {describeAction(m.proposedAction).label}
                  </p>

                  {m.actionState === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmAction(m.id, m.proposedAction!)}
                        className="flex-1 rounded-lg bg-primary-500 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-600"
                      >
                        Konfirmasi
                      </button>
                      <button
                        onClick={() => cancelAction(m.id)}
                        className="flex-1 rounded-lg border border-line py-2 text-xs font-semibold text-ink/50 transition-colors hover:bg-cloud"
                      >
                        Batal
                      </button>
                    </div>
                  )}

                  {m.actionState === "cancelled" && (
                    <p className="text-xs font-medium text-ink/40">
                      Dibatalkan.
                    </p>
                  )}

                  {m.actionState === "confirmed" && !m.actionResultMessage && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-ink/40">
                      <FontAwesomeIcon icon={faCircleNotch} className="h-3 w-3 animate-spin" />
                      Menjalankan...
                    </p>
                  )}

                  {m.actionState === "confirmed" && m.actionResultMessage && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
                      {m.actionResultMessage}
                    </p>
                  )}

                  {m.actionState === "error" && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" />
                      {m.actionResultMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-ink/30">
            <FontAwesomeIcon icon={faCircleNotch} className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">AI sedang mengetik...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">
          <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" />
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-5 shadow-card transition-shadow focus-within:border-primary-300 focus-within:shadow-soft">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Tanya sesuatu, contoh: buat repo demo-app"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-soft transition-all hover:scale-105 hover:bg-primary-600 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-ink/15 disabled:shadow-none"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
