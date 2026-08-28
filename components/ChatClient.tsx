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
  faBroom,
  faPaperclip,
  faCloudArrowUp,
  faXmark,
  faFile
} from "@fortawesome/free-solid-svg-icons";
import "@/lib/fontawesome";
import { useToast } from "@/components/ToastProvider";
import { appendUploadHistory } from "@/lib/uploadHistoryClient";

type ProposedAction =
  | { type: "delete_repo"; repo: string }
  | { type: "create_repo"; repo: string; visibility: "public" | "private" }
  | { type: "delete_file"; repo: string; path: string }
  | { type: "change_visibility"; repo: string; visibility: "public" | "private" }
  | { type: "rename_repo"; repo: string; newName: string }
  | { type: "upload_files"; repo: string }
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
    case "upload_files":
      return {
        icon: faCloudArrowUp,
        label: `Upload file ke repo "${action.repo}"`
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
  attachedFileNames?: string[];
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
  text: "Halo! Saya bisa bantu jawab pertanyaan seputar repo kamu, baca isi file, cari kode di semua repo, atau usulkan aksi seperti upload file, membuat/menghapus repo — setiap aksi tetap butuh konfirmasi kamu dulu."
};

export default function ChatClient() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => loadStoredMessages() || [WELCOME_MESSAGE]
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filesByMessageId = useRef<Map<string, File[]>>(new Map());

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handlePickFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setPendingFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || loading) return;
    setInput("");
    setError("");

    const attachedFiles = pendingFiles;
    setPendingFiles([]);

    const userMsgId = `u-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: text || `(mengirim ${attachedFiles.length} file)`,
      attachedFileNames: attachedFiles.length
        ? attachedFiles.map((f) => f.name)
        : undefined
    };
    if (attachedFiles.length) {
      filesByMessageId.current.set(userMsgId, attachedFiles);
    }
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const recentHistory = messages
        .slice(-8)
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || "(pengguna melampirkan file, tanyakan mau diupload ke repo mana jika belum jelas)",
          history: recentHistory
        })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "AI tidak merespons.");
        setLoading(false);
        return;
      }

      let proposedAction: ProposedAction = data.proposedAction;
      if (attachedFiles.length > 0 && proposedAction.type === "none") {
        const repoGuessMatch = text.match(/repo\s+([a-z0-9._-]+)/i);
        if (repoGuessMatch) {
          proposedAction = { type: "upload_files", repo: repoGuessMatch[1] };
        }
      }

      const aiMsgId = `a-${Date.now()}`;
      if (proposedAction.type === "upload_files" && attachedFiles.length) {
        filesByMessageId.current.set(aiMsgId, attachedFiles);
      }

      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "ai",
        text: data.reply,
        proposedAction,
        actionState: proposedAction.type !== "none" ? "pending" : undefined
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
      let res: Response;

      if (action.type === "upload_files") {
        const files = filesByMessageId.current.get(msgId) || [];
        if (!files.length) {
          throw new Error("Tidak ada file terlampir untuk diupload.");
        }
        const formData = new FormData();
        formData.set("repo", action.repo);
        files.forEach((f) => formData.append("files", f));
        res = await fetch("/api/ai/execute-upload", {
          method: "POST",
          body: formData
        });
      } else {
        res = await fetch("/api/ai/execute-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action)
        });
      }

      const data = await res.json();

      if (action.type === "upload_files" && data.ok && data.results) {
        const now = new Date().toISOString();
        appendUploadHistory(
          data.results.map((r: any) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            repo: data.repo,
            owner: data.owner,
            fileName: r.fileName,
            finalPath: r.finalPath,
            sizeBytes: r.sizeBytes,
            status: r.status,
            createdAt: now
          }))
        );
      }

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
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                actionState: "error",
                actionResultMessage: err?.message || "Koneksi terputus."
              }
            : m
        )
      );
      showToast(err?.message || "Koneksi terputus.", "error");
    }
  }

  function cancelAction(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionState: "cancelled" } : m))
    );
    filesByMessageId.current.delete(msgId);
  }

  function clearChat() {
    setMessages([WELCOME_MESSAGE]);
    filesByMessageId.current.clear();
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

              {m.attachedFileNames && m.attachedFileNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.attachedFileNames.map((name) => (
                    <span
                      key={name}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        m.role === "user"
                          ? "bg-white/20 text-white"
                          : "bg-white text-ink/60"
                      }`}
                    >
                      <FontAwesomeIcon icon={faFile} className="h-2.5 w-2.5" />
                      {name}
                    </span>
                  ))}
                </div>
              )}

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

      {pendingFiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-line bg-white p-3">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-primary-700"
            >
              <FontAwesomeIcon icon={faFile} className="h-3 w-3" />
              {f.name}
              <button
                onClick={() => removePendingFile(i)}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-primary-400 hover:text-primary-700"
              >
                <FontAwesomeIcon icon={faXmark} className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-3 shadow-card transition-shadow focus-within:border-primary-300 focus-within:shadow-soft">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handlePickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-mist hover:text-primary-600"
          title="Lampirkan file"
        >
          <FontAwesomeIcon icon={faPaperclip} className="h-3.5 w-3.5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Tanya sesuatu, contoh: baca file src/index.js di repo demo-app"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={(!input.trim() && pendingFiles.length === 0) || loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-soft transition-all hover:scale-105 hover:bg-primary-600 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-ink/15 disabled:shadow-none"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
