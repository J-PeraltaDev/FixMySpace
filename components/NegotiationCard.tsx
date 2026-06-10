"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { acceptRequestProposal, modifyRequestProposal, rejectRequestProposal } from "@/lib/firebase-data";
import type { ServiceRequest, UserProfile } from "@/lib/types";

export function NegotiationCard({
  currentProfile,
  otherUserId,
}: {
  currentProfile: UserProfile;
  otherUserId: string;
}) {
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  
  const [draftPrice, setDraftPrice] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");

  const isClient = currentProfile.role === "cliente";
  const clientId = isClient ? currentProfile.uid : otherUserId;
  const workerId = isClient ? otherUserId : currentProfile.uid;

  useEffect(() => {
    const q = query(
      collection(db, "serviceRequests"),
      where("clientId", "==", clientId),
      where("workerId", "==", workerId),
      where("status", "in", ["pending", "negotiating"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          // Assuming at most 1 active request between these two
          const doc = snapshot.docs[0];
          const data = { id: doc.id, ...doc.data() } as ServiceRequest;
          setRequest(data);
          setDraftPrice((data.proposedPrice ?? data.price ?? "").toString());
          setDraftDate(data.proposedDate ?? data.preferredDate);
          setDraftTime(data.proposedTime ?? data.preferredTime);
        } else {
          setRequest(null);
        }
      },
      (err) => {
        console.error("Error fetching negotiation request:", err);
      }
    );

    return unsubscribe;
  }, [clientId, workerId]);

  if (!request) return null;

  const amILastProposer = request.lastProposalBy === currentProfile.uid;
  
  // Format current conditions
  const currentPrice = request.proposedPrice ?? request.price;
  const priceDisplay = currentPrice ? `$${currentPrice.toLocaleString("es-CO")}` : "Por definir";
  const currentDate = request.proposedDate ?? request.preferredDate;
  const currentTime = request.proposedTime ?? request.preferredTime;

  async function handleAccept() {
    setLoadingAction(true);
    setError("");
    try {
      await acceptRequestProposal(request!, clientId, workerId);
    } catch (err) {
      setError("No pudimos aceptar la solicitud.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleReject() {
    setLoadingAction(true);
    setError("");
    try {
      await rejectRequestProposal(request!.id);
    } catch (err) {
      setError("No pudimos rechazar la solicitud.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleModifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAction(true);
    setError("");
    try {
      await modifyRequestProposal(
        request!.id,
        Number(draftPrice),
        draftDate,
        draftTime,
        currentProfile.uid
      );
      setIsModifying(false);
    } catch (err) {
      setError("No pudimos modificar la solicitud.");
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="m-4 rounded-xl border border-[#00261e] bg-[#bfecdd] shadow-sm overflow-hidden">
      <div className="bg-[#00261e] px-4 py-2 text-white">
        <h3 className="font-bold">
          {request.status === "pending" ? "Nueva Solicitud" : "Negociación Activa"}
        </h3>
        <p className="text-xs opacity-90">{request.title}</p>
      </div>

      <div className="p-4">
        {error && <p className="mb-3 rounded-lg bg-[#ffdad6] px-3 py-2 text-sm font-semibold text-[#93000a]">{error}</p>}

        {!isModifying ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm text-[#00261e]">
              <div>
                <span className="block font-semibold">Fecha y Hora</span>
                <span>{currentDate} a las {currentTime}</span>
              </div>
              <div>
                <span className="block font-semibold">Precio Propuesto</span>
                <span>{priceDisplay}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#00261e]/20">
              {amILastProposer ? (
                <p className="text-sm font-semibold text-[#00261e] text-center italic">
                  Esperando respuesta de la otra parte...
                </p>
              ) : (
                <div className="flex gap-2 justify-end flex-wrap">
                  <button 
                    onClick={handleReject}
                    disabled={loadingAction}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-[#93000a] bg-[#ffdad6] hover:bg-[#ffb4ab] transition"
                  >
                    Rechazar
                  </button>
                  <button 
                    onClick={() => setIsModifying(true)}
                    disabled={loadingAction}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-[#00261e] bg-white border border-[#00261e] hover:bg-[#f2f4f2] transition"
                  >
                    Modificar
                  </button>
                  <button 
                    onClick={handleAccept}
                    disabled={loadingAction}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-white bg-[#00261e] hover:bg-[#003b2f] transition"
                  >
                    Aceptar
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleModifySubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#00261e] mb-1">Fecha propueta</label>
                <input 
                  type="date" 
                  required
                  value={draftDate}
                  onChange={e => setDraftDate(e.target.value)}
                  className="w-full rounded-lg border border-[#00261e]/30 px-3 py-2 text-sm outline-none focus:border-[#00261e]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#00261e] mb-1">Hora propueta</label>
                <input 
                  type="time" 
                  required
                  value={draftTime}
                  onChange={e => setDraftTime(e.target.value)}
                  className="w-full rounded-lg border border-[#00261e]/30 px-3 py-2 text-sm outline-none focus:border-[#00261e]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#00261e] mb-1">Precio propuesto ($)</label>
              <input 
                type="number" 
                min="0"
                step="1000"
                required
                value={draftPrice}
                onChange={e => setDraftPrice(e.target.value)}
                className="w-full rounded-lg border border-[#00261e]/30 px-3 py-2 text-sm outline-none focus:border-[#00261e]"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button 
                type="button"
                onClick={() => setIsModifying(false)}
                disabled={loadingAction}
                className="rounded-lg px-4 py-2 text-sm font-bold text-[#414845] hover:bg-black/5 transition"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loadingAction}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white bg-[#00261e] hover:bg-[#003b2f] transition"
              >
                Enviar Propuesta
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
