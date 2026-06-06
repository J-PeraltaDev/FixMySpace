"use client";

import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { timestampToText } from "@/lib/firebase-data";
import type { Conversation } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";

type ConversationPreview = Conversation & {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
};

function updatedAtMillis(conversation: Conversation) {
  const value = conversation.updatedAt;
  if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
}

function fallbackAction(role?: string) {
  if (role === "trabajador") {
    return {
      title: "Aún no tienes conversaciones",
      message: "Cuando respondas una solicitud o un cliente te escriba, los chats aparecerán aquí.",
      actionHref: "/dashboard",
      actionLabel: "Ver solicitudes",
    };
  }

  if (role === "admin") {
    return {
      title: "Sin conversaciones activas",
      message: "La supervisión principal se realiza desde el panel administrativo.",
      actionHref: "/admin",
      actionLabel: "Ir a administración",
    };
  }

  return {
    title: "Aún no tienes conversaciones",
    message: "Abre el perfil de un trabajador y usa el botón de chat para iniciar una conversación.",
    actionHref: "/buscar",
    actionLabel: "Buscar trabajadores",
  };
}

export function MessagesInbox() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "conversations"), where("participantIds", "array-contains", profile.uid)),
      async (snapshot) => {
        setLoading(true);
        setError("");

        try {
          const previews = await Promise.all(
            snapshot.docs.map(async (conversationSnapshot) => {
              const conversation = { id: conversationSnapshot.id, ...conversationSnapshot.data() } as Conversation;
              const partnerId = conversation.participantIds.find((id) => id !== profile.uid) || "";
              let partnerName = "Conversación";
              let partnerRole = "usuario";

              if (partnerId) {
                const partnerSnapshot = await getDoc(doc(db, "users", partnerId));
                if (partnerSnapshot.exists()) {
                  const partner = partnerSnapshot.data();
                  partnerName = typeof partner.fullName === "string" ? partner.fullName : partnerName;
                  partnerRole = typeof partner.role === "string" ? partner.role : partnerRole;
                }
              }

              return {
                ...conversation,
                partnerId,
                partnerName,
                partnerRole,
              };
            }),
          );

          setConversations(previews.sort((a, b) => updatedAtMillis(b) - updatedAtMillis(a)));
        } catch {
          setError("No pudimos preparar la lista de mensajes.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("No pudimos leer tus conversaciones en Firestore.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [profile]);

  const empty = fallbackAction(profile?.role);

  if (loading) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="soft-card h-24 animate-pulse bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{error}</p>;
  }

  if (!conversations.length) {
    return <EmptyState {...empty} />;
  }

  return (
    <section className="grid gap-3">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/chat/${conversation.partnerId || conversation.id}`}
          className="soft-card block p-5 transition hover:-translate-y-0.5 hover:border-[#00261e]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[#5f5e5a]">{conversation.partnerRole}</p>
              <h2 className="mt-1 text-lg font-bold text-[#191c1b]">{conversation.partnerName}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#414845]">{conversation.lastMessage || "Conversación iniciada. Escribe para continuar."}</p>
            </div>
            <span className="shrink-0 rounded-md bg-[#eceeec] px-3 py-1 text-xs font-bold text-[#414845]">
              {timestampToText(conversation.updatedAt)}
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
