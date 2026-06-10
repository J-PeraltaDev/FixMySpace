import {
  DocumentData,
  QueryDocumentSnapshot,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/firebase";
import { normalizeWorkerProfile } from "./worker-profile";
import type {
  Booking,
  JobEvidence,
  JobHistory,
  Notification,
  Review,
  ServiceRequest,
  SupportReport,
  AdminWorkerProfile,
  PublicProfile,
  UserProfile,
  WorkerProfile,
  WorkerVerification,
} from "./types";

type AnyRecord = Record<string, unknown>;

export const serviceRequestStatuses = ["pending", "negotiating", "accepted", "scheduled", "completed", "cancelled", "rejected"] as const;
export const bookingStatuses = ["accepted", "scheduled", "completed", "cancelled"] as const;

function dataWithId<T>(snapshot: QueryDocumentSnapshot<DocumentData>) {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

export function timestampToText(value: unknown) {
  if (!value) return "Sin fecha";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  }
  return "Fecha registrada";
}

export async function fetchWorkers() {
  const snapshots = await getDocs(query(collection(db, "workerProfiles"), where("published", "==", true)));
  return snapshots.docs.map((workerSnapshot) => normalizeWorkerProfile(workerSnapshot.id, workerSnapshot.data()));
}

export async function fetchWorkerById(uid: string) {
  const [workerSnapshot, publicSnapshot] = await Promise.all([
    getDoc(doc(db, "workerProfiles", uid)),
    getDoc(doc(db, "publicProfiles", uid)),
  ]);
  if (!workerSnapshot.exists()) return null;
  return normalizeWorkerProfile(uid, workerSnapshot.data(), publicSnapshot.exists() ? publicSnapshot.data() : {});
}

export async function fetchPublicProfile(uid: string) {
  const snapshot = await getDoc(doc(db, "publicProfiles", uid));
  return snapshot.exists() ? ({ uid, ...snapshot.data() } as PublicProfile) : null;
}

export async function fetchReviewsByWorker(workerId: string) {
  const snapshots = await getDocs(query(collection(db, "reviews"), where("workerId", "==", workerId)));
  return snapshots.docs.map((snapshot) => dataWithId<Review>(snapshot));
}

export async function fetchUserRequests(userId: string, role: string) {
  const field = role === "trabajador" ? "workerId" : "clientId";
  const snapshots = await getDocs(query(collection(db, "serviceRequests"), where(field, "==", userId)));
  return snapshots.docs.map((snapshot) => dataWithId<ServiceRequest>(snapshot));
}

export async function fetchUserBookings(userId: string, role: string) {
  const field = role === "trabajador" ? "workerId" : "clientId";
  const snapshots = await getDocs(query(collection(db, "bookings"), where(field, "==", userId)));
  return snapshots.docs.map((snapshot) => dataWithId<Booking>(snapshot));
}

export async function fetchUserHistory(userId: string) {
  const snapshots = await getDocs(query(collection(db, "jobHistory"), where("userId", "==", userId)));
  return snapshots.docs.map((snapshot) => dataWithId<JobHistory>(snapshot));
}

export async function fetchEvidencesByBooking(bookingId: string) {
  const snapshots = await getDocs(query(collection(db, "jobEvidences"), where("bookingId", "==", bookingId)));
  return snapshots.docs.map((snapshot) => dataWithId<JobEvidence>(snapshot));
}

export async function uploadImage(file: File, path: string) {
  const storageRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createNotification(input: Omit<Notification, "id" | "createdAt" | "read"> & { read?: boolean }) {
  const actorId = auth.currentUser?.uid;
  if (!actorId) throw new Error("Se requiere una sesión activa para crear notificaciones.");
  await addDoc(collection(db, "notifications"), {
    ...input,
    actorId,
    read: input.read ?? false,
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

export async function syncPublicProfile(profile: UserProfile) {
  const publicProfile = buildPublicProfile(profile);
  const batch = writeBatch(db);
  batch.set(doc(db, "publicProfiles", profile.uid), publicProfile, { merge: true });
  if (profile.role === "trabajador") {
    const workerSnapshot = await getDoc(doc(db, "workerProfiles", profile.uid));
    batch.set(
      doc(db, "workerProfiles", profile.uid),
      workerSnapshot.exists()
        ? {
            uid: profile.uid,
            role: "trabajador",
            fullName: profile.fullName,
            municipality: profile.municipality,
            avatarUrl: profile.avatarUrl || "",
          }
        : buildWorkerProfile(profile),
      { merge: true },
    );
  }
  await batch.commit();
}

export function buildPublicProfile(profile: UserProfile): PublicProfile {
  return {
    uid: profile.uid,
    role: profile.role,
    fullName: profile.fullName,
    municipality: profile.municipality,
    avatarUrl: profile.avatarUrl || "",
  };
}

export function buildWorkerProfile(profile: Pick<UserProfile, "uid" | "fullName" | "municipality" | "avatarUrl">) {
  return {
    uid: profile.uid,
    role: "trabajador",
    fullName: profile.fullName || "Perfil sin nombre",
    municipality: profile.municipality,
    avatarUrl: profile.avatarUrl || "",
    specialties: [],
    coverageAreas: profile.municipality ? [profile.municipality] : [],
    bio: "",
    experienceYears: 0,
    hourlyRate: 0,
    verified: false,
    published: false,
    ratingAvg: 0,
    completedJobs: 0,
    distanceKm: 0,
    responseTime: "Responde pronto",
  };
}

export async function ensureWorkerProfile(uid: string, municipality = "", identity: Partial<PublicProfile> = {}) {
  await setDoc(
    doc(db, "workerProfiles", uid),
    buildWorkerProfile({
      uid,
      fullName: identity.fullName || "Perfil sin nombre",
      municipality,
      avatarUrl: identity.avatarUrl || "",
    }),
    { merge: true },
  );
}

export async function fetchAdminCollections() {
  const [users, workerProfiles, workerVerifications, serviceRequests, bookings, reviews, reports, notifications] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "workerProfiles")),
    getDocs(collection(db, "workerVerifications")),
    getDocs(collection(db, "serviceRequests")),
    getDocs(collection(db, "bookings")),
    getDocs(collection(db, "reviews")),
    getDocs(collection(db, "supportReports")),
    getDocs(collection(db, "notifications")),
  ]);
  const verificationByWorker = new Map(
    workerVerifications.docs.map((snapshot) => [snapshot.id, snapshot.data() as WorkerVerification]),
  );
  const userById = new Map(users.docs.map((snapshot) => [snapshot.id, snapshot.data() as UserProfile]));
  const adminWorkers: AdminWorkerProfile[] = workerProfiles.docs.map((snapshot) => {
    const worker = normalizeWorkerProfile(snapshot.id, snapshot.data(), userById.get(snapshot.id) as AnyRecord | undefined);
    return {
      ...worker,
      verificationStatus: resolveVerificationStatus(worker, verificationByWorker.get(worker.uid)),
    };
  });

  return {
    users: users.docs.map((snapshot) => ({ uid: snapshot.id, ...snapshot.data() }) as UserProfile),
    workers: adminWorkers,
    serviceRequests: serviceRequests.docs.map((snapshot) => dataWithId<ServiceRequest>(snapshot)),
    bookings: bookings.docs.map((snapshot) => dataWithId<Booking>(snapshot)),
    reviews: reviews.docs.map((snapshot) => dataWithId<Review>(snapshot)),
    reports: reports.docs.map((snapshot) => dataWithId<SupportReport>(snapshot)),
    notifications: notifications.docs.map((snapshot) => dataWithId<Notification>(snapshot)),
  };
}

export function resolveVerificationStatus(
  workerProfile: Pick<Partial<WorkerProfile>, "verified"> | null | undefined,
  verification: Pick<Partial<WorkerVerification>, "status"> | null | undefined,
): WorkerVerification["status"] {
  if (verification?.status === "verified" || verification?.status === "rejected" || verification?.status === "pending") {
    return verification.status;
  }
  return workerProfile?.verified ? "verified" : "pending";
}

export async function modifyRequestProposal(
  requestId: string,
  proposedPrice: number,
  proposedDate: string,
  proposedTime: string,
  userId: string,
) {
  await updateDoc(doc(db, "serviceRequests", requestId), {
    status: "negotiating",
    proposedPrice,
    proposedDate,
    proposedTime,
    lastProposalBy: userId,
  });
}

export async function rejectRequestProposal(requestId: string) {
  await updateDoc(doc(db, "serviceRequests", requestId), {
    status: "rejected",
  });
}

export async function acceptRequestProposal(
  request: ServiceRequest,
  clientId: string,
  workerId: string,
) {
  const batch = writeBatch(db);
  const requestRef = doc(db, "serviceRequests", request.id);
  
  // Set final values based on proposal
  const finalPrice = request.proposedPrice ?? request.price ?? 0;
  const finalDate = request.proposedDate ?? request.preferredDate;
  const finalTime = request.proposedTime ?? request.preferredTime;
  
  batch.update(requestRef, {
    status: "scheduled",
    price: finalPrice,
    preferredDate: finalDate,
    preferredTime: finalTime,
    // Clear proposal fields if desired, or keep them for history
  });

  const bookingRef = doc(collection(db, "bookings"));
  const scheduledAt = `${finalDate} ${finalTime}`;
  
  batch.set(bookingRef, {
    requestId: request.id,
    clientId,
    workerId,
    scheduledAt,
    status: "scheduled",
    notes: request.description,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, "jobHistory", `${bookingRef.id}_${clientId}`), {
    bookingId: bookingRef.id,
    userId: clientId,
    clientId,
    workerId,
    service: request.title,
    status: "scheduled",
    events: ["Solicitud aceptada y agendada"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, "jobHistory", `${bookingRef.id}_${workerId}`), {
    bookingId: bookingRef.id,
    userId: workerId,
    clientId,
    workerId,
    service: request.title,
    status: "scheduled",
    events: ["Nueva reserva asignada"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
