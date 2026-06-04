"use client";

import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { createNotification, fetchWorkerById, timestampToText } from "@/lib/firebase-data";
import { messages as mockMessages, workers as fallbackWorkers } from "@/lib/mock-data";
import type { ConversationMessage, WorkerProfile } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { WorkerAvatar } from "./WorkerCard";

function createdAtMillis(message: ConversationMessage) {
  const value = message.createdAt;
  if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
}

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { profile } = useAuth();
  const [worker, setWorker] = useState<WorkerProfile | null>(() => fallbackWorkers.find((item) => item.uid === conversationId) || null);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function prepareConversation() {
      if (!profile) return;
      setLoading(true);
      setError("");
      try {
        const workerProfile = await fetchWorkerById(conversationId);
        const resolvedWorker = workerProfile || fallbackWorkers.find((item) => item.uid === conversationId) || null;
        const resolvedConversationId = resolvedWorker ? [profile.uid, resolvedWorker.uid].sort().join("_") : conversationId;

        if (resolvedWorker) {
          await setDoc(
            doc(db, "conversations", resolvedConversationId),
            {
              participantIds: [profile.uid, resolvedWorker.uid],
              lastMessage: "",
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }

        if (!cancelled) {
          setWorker(resolvedWorker);
          setActiveConversationId(resolvedConversationId);
        }
      } catch {
        if (!cancelled) {
          setWorker(fallbackWorkers.find((item) => item.uid === conversationId) || null);
          setError("No pudimos preparar la conversación en Firestore.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    prepareConversation();
    return () => {
      cancelled = true;
    };
  }, [conversationId, profile]);

  useEffect(() => {
    if (!profile || !activeConversationId) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "messages"), where("conversationId", "==", activeConversationId)),
      (snapshot) => {
        const nextMessages = snapshot.docs
          .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as ConversationMessage)
          .sort((a, b) => createdAtMillis(a) - createdAtMillis(b));
        setMessages(nextMessages);
      },
      () => setError("No pudimos leer los mensajes de Firestore."),
    );

    return unsubscribe;
  }, [activeConversationId, profile]);

  const visibleMessages = useMemo(() => {
    if (messages.length) return messages;
    return mockMessages.filter((message) => message.conversationId === conversationId).slice(0, 2);
  }, [conversationId, messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || !profile) return;

    const text = draft.trim();
    setDraft("");

    try {
      await addDoc(collection(db, "messages"), {
        conversationId: activeConversationId,
        senderId: profile.uid,
        text,
        attachments: [],
        createdAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, "conversations", activeConversationId),
        {
          participantIds: worker ? [profile.uid, worker.uid] : [profile.uid],
          lastMessage: text,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (worker && worker.uid !== profile.uid) {
        await createNotification({
          userId: worker.uid,
          type: "message",
          title: "Nuevo mensaje",
          message: `${profile.fullName}: ${text.slice(0, 80)}`,
          relatedEntityId: activeConversationId,
          relatedEntityType: "conversation",
        });
      }
    } catch {
      setError("No pudimos enviar el mensaje.");
      setDraft(text);
    }
  }

  const headerWorker =
    worker ||
    ({
      uid: "conversation",
      fullName: "Conversación",
      municipality: "",
      avatarUrl: "",
      specialties: ["Chat"],
      coverageAreas: [],
      bio: "",
      experienceYears: 0,
      hourlyRate: 0,
      verified: false,
      ratingAvg: 0,
      completedJobs: 0,
      distanceKm: 0,
      responseTime: "Firestore",
    } satisfies WorkerProfile);

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white shadow-sm">
        <header className="flex items-center gap-4 border-b border-slate-100 p-4">
          <WorkerAvatar worker={headerWorker} size="sm" />
          <div>
            <h1 className="text-lg font-black text-slate-950">{headerWorker.fullName}</h1>
            <p className="text-sm font-semibold text-emerald-800">{headerWorker.responseTime} · {headerWorker.specialties[0] || "Conversación"}</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{loading ? "Cargando" : "Activo"}</span>
        </header>

        {error && <p className="m-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
          {visibleMessages.length ? (
            visibleMessages.map((message) => {
              const isMine = message.senderId === profile?.uid || (!profile && message.senderId !== headerWorker.uid);
              return (
                <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[68%] ${isMine ? "bg-emerald-950 text-white" : "bg-white text-slate-700"}`}>
                    <p className="text-sm leading-6">{message.text}</p>
                    <p className={`mt-1 text-xs ${isMine ? "text-emerald-100" : "text-slate-400"}`}>{timestampToText(message.createdAt)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl bg-white p-5 text-center text-sm font-semibold text-slate-500">Aún no hay mensajes. Escribe el primero para iniciar la conversación.</div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-3 border-t border-slate-100 bg-white p-3 sm:p-4">
          <input
            className="min-h-12 flex-1 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-emerald-900"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe un mensaje"
          />
          <button className="primary-button min-h-12" type="submit">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
