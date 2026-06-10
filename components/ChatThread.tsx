"use client";

import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { createNotification, fetchPublicProfile, fetchWorkerById, timestampToText } from "@/lib/firebase-data";
import type { ConversationMessage, WorkerProfile } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { WorkerAvatar } from "./WorkerCard";
import { NegotiationCard } from "./NegotiationCard";

function createdAtMillis(message: ConversationMessage) {
  const value = message.createdAt;
  if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
}

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { profile } = useAuth();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
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
        const resolvedConversationId = [profile.uid, conversationId].sort().join("_");
        const [workerProfile, publicProfile] = await Promise.all([
          fetchWorkerById(conversationId).catch(() => null),
          fetchPublicProfile(conversationId),
        ]);
        const resolvedWorker =
          workerProfile ||
          (publicProfile
            ? ({
                uid: conversationId,
                fullName: publicProfile.fullName || "Perfil no disponible",
                municipality: publicProfile.municipality || "",
                avatarUrl: publicProfile.avatarUrl || "",
                specialties: [publicProfile.role],
                coverageAreas: [],
                bio: "",
                experienceYears: 0,
                hourlyRate: 0,
                verified: false,
                ratingAvg: 0,
                completedJobs: 0,
                distanceKm: 0,
                responseTime: "Conversación",
              } satisfies WorkerProfile)
            : null);
        await setDoc(
          doc(db, "conversations", resolvedConversationId),
          { participantIds: [profile.uid, conversationId] },
          { merge: true },
        );

        if (!cancelled) {
          setWorker(resolvedWorker);
          setActiveConversationId(resolvedConversationId);
        }
      } catch {
        if (!cancelled) {
          setWorker(null);
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

  const visibleMessages = useMemo(() => messages, [messages]);

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
        read: false,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "conversations", activeConversationId), {
          lastMessage: text,
          updatedAt: serverTimestamp(),
        });

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
      fullName: "Perfil no disponible",
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
      responseTime: "Sin datos de Firebase",
    } satisfies WorkerProfile);

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-4xl flex-col overflow-hidden rounded-xl border border-[#c0c8c4] bg-white shadow-sm">
        <header className="flex items-center gap-4 border-b border-[#c0c8c4] p-4">
          <WorkerAvatar worker={headerWorker} size="sm" />
          <div>
            <h1 className="text-lg font-bold text-[#191c1b]">{headerWorker.fullName}</h1>
            <p className="text-sm font-semibold text-[#5f5e5a]">{headerWorker.responseTime} · {headerWorker.specialties[0] || "Conversación"}</p>
          </div>
          <span className="ml-auto rounded-md bg-[#bfecdd] px-3 py-1 text-xs font-bold text-[#00261e]">{loading ? "Cargando" : "Activo"}</span>
        </header>

        {error && <p className="m-4 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{error}</p>}

        {profile && (
          <NegotiationCard currentProfile={profile} otherUserId={conversationId} />
        )}

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#f2f4f2] p-4 sm:p-6">
          {visibleMessages.length ? (
            visibleMessages.map((message) => {
              const isMine = message.senderId === profile?.uid || (!profile && message.senderId !== headerWorker.uid);
              return (
                <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-xl px-4 py-3 shadow-sm sm:max-w-[68%] ${isMine ? "bg-[#00261e] text-white" : "bg-white text-[#414845]"}`}>
                    <p className="text-sm leading-6">{message.text}</p>
                    <p className={`mt-1 text-xs ${isMine ? "text-[#bfecdd]" : "text-[#5f5e5a]"}`}>{timestampToText(message.createdAt)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl bg-white p-5 text-center text-sm font-semibold text-[#5f5e5a]">Aún no hay mensajes. Escribe el primero para iniciar la conversación.</div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-3 border-t border-[#c0c8c4] bg-white p-3 sm:p-4">
          <input
            className="min-h-12 flex-1 rounded-lg border border-[#c0c8c4] px-4 text-sm outline-none focus:border-[#00261e]"
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
