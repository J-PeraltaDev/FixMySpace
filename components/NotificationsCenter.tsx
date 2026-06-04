"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { markNotificationRead, timestampToText } from "@/lib/firebase-data";
import type { Notification } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export function NotificationsCenter() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    return onSnapshot(
      query(collection(db, "notifications"), where("userId", "==", profile.uid)),
      (snapshot) => {
        const nextNotifications = snapshot.docs
          .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Notification)
          .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
        setNotifications(nextNotifications);
        setLoading(false);
      },
      () => {
        setError("No pudimos cargar tus notificaciones.");
        setLoading(false);
      },
    );
  }, [profile]);

  async function readNotification(id: string) {
    try {
      await markNotificationRead(id);
    } catch {
      setError("No pudimos marcar la notificación como leída.");
    }
  }

  if (loading) return <div className="soft-card h-44 animate-pulse bg-white" />;
  if (error) return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>;
  if (!notifications.length) return <EmptyState title="No tienes notificaciones" message="Los avisos sobre agenda, chat, evidencias, reseñas y soporte aparecerán aquí." />;

  return (
    <div className="grid gap-3">
      {notifications.map((notification) => (
        <article key={notification.id} className="soft-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-950">{notification.title}</h2>
                <StatusBadge status={notification.read ? "read" : "unread"} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{timestampToText(notification.createdAt)}</p>
            </div>
            {!notification.read && (
              <button className="secondary-button" type="button" onClick={() => readNotification(notification.id)}>
                Marcar leído
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
