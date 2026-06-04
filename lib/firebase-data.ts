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
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/firebase";
import { workers as fallbackWorkers } from "./mock-data";
import type {
  Booking,
  JobEvidence,
  JobHistory,
  Notification,
  Review,
  ServiceRequest,
  SupportReport,
  UserProfile,
  WorkerProfile,
} from "./types";

type AnyRecord = Record<string, unknown>;

export const serviceRequestStatuses = ["pending", "accepted", "scheduled", "completed", "cancelled"] as const;
export const bookingStatuses = ["accepted", "scheduled", "completed", "cancelled"] as const;

function dataWithId<T>(snapshot: QueryDocumentSnapshot<DocumentData>) {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

function mergeWorker(uid: string, profileData: AnyRecord, userData: AnyRecord = {}): WorkerProfile {
  const fallback = fallbackWorkers.find((worker) => worker.uid === uid);

  return {
    uid,
    fullName: asString(userData.fullName, fallback?.fullName || "Trabajador FixMySpace"),
    municipality: asString(userData.municipality, fallback?.municipality || ""),
    avatarUrl: asString(userData.avatarUrl, fallback?.avatarUrl || ""),
    specialties: asStringArray(profileData.specialties),
    coverageAreas: asStringArray(profileData.coverageAreas),
    bio: asString(profileData.bio, fallback?.bio || "Perfil profesional en construcción."),
    experienceYears: asNumber(profileData.experienceYears, fallback?.experienceYears || 0),
    hourlyRate: asNumber(profileData.hourlyRate, fallback?.hourlyRate || 0),
    verified: Boolean(profileData.verified),
    verificationStatus: asString(profileData.verificationStatus, Boolean(profileData.verified) ? "verified" : "pending") as WorkerProfile["verificationStatus"],
    verificationNotes: asString(profileData.verificationNotes),
    verifiedAt: profileData.verifiedAt,
    verifiedBy: asString(profileData.verifiedBy),
    ratingAvg: asNumber(profileData.ratingAvg, fallback?.ratingAvg || 0),
    completedJobs: asNumber(profileData.completedJobs, fallback?.completedJobs || 0),
    distanceKm: asNumber(profileData.distanceKm, fallback?.distanceKm || 0),
    responseTime: asString(profileData.responseTime, fallback?.responseTime || "Responde pronto"),
  };
}

export async function fetchWorkers() {
  const snapshots = await getDocs(collection(db, "workerProfiles"));
  const workers = await Promise.all(
    snapshots.docs.map(async (workerSnapshot) => {
      const userSnapshot = await getDoc(doc(db, "users", workerSnapshot.id));
      return mergeWorker(workerSnapshot.id, workerSnapshot.data(), userSnapshot.exists() ? userSnapshot.data() : {});
    }),
  );

  return workers;
}

export async function fetchWorkerById(uid: string) {
  const workerSnapshot = await getDoc(doc(db, "workerProfiles", uid));
  if (!workerSnapshot.exists()) return null;
  const userSnapshot = await getDoc(doc(db, "users", uid));
  return mergeWorker(uid, workerSnapshot.data(), userSnapshot.exists() ? userSnapshot.data() : {});
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
  await addDoc(collection(db, "notifications"), {
    ...input,
    read: input.read ?? false,
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

export async function ensureWorkerProfile(uid: string, municipality = "") {
  await setDoc(
    doc(db, "workerProfiles", uid),
    {
      specialties: [],
      coverageAreas: municipality ? [municipality] : [],
      bio: "",
      experienceYears: 0,
      hourlyRate: 0,
      verified: false,
      verificationStatus: "pending",
      verificationNotes: "",
      verifiedAt: null,
      verifiedBy: "",
      ratingAvg: 0,
      completedJobs: 0,
    },
    { merge: true },
  );
}

export async function fetchAdminCollections() {
  const [users, workerProfiles, serviceRequests, bookings, reviews, reports, notifications] = await Promise.all([
    getDocs(collection(db, "users")),
    fetchWorkers(),
    getDocs(collection(db, "serviceRequests")),
    getDocs(collection(db, "bookings")),
    getDocs(collection(db, "reviews")),
    getDocs(collection(db, "supportReports")),
    getDocs(collection(db, "notifications")),
  ]);

  return {
    users: users.docs.map((snapshot) => ({ uid: snapshot.id, ...snapshot.data() }) as UserProfile),
    workers: workerProfiles,
    serviceRequests: serviceRequests.docs.map((snapshot) => dataWithId<ServiceRequest>(snapshot)),
    bookings: bookings.docs.map((snapshot) => dataWithId<Booking>(snapshot)),
    reviews: reviews.docs.map((snapshot) => dataWithId<Review>(snapshot)),
    reports: reports.docs.map((snapshot) => dataWithId<SupportReport>(snapshot)),
    notifications: notifications.docs.map((snapshot) => dataWithId<Notification>(snapshot)),
  };
}
