import type { WorkerProfile } from "./types";

type AnyRecord = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function normalizeWorkerProfile(uid: string, profileData: AnyRecord, identityData: AnyRecord = {}): WorkerProfile {
  return {
    uid,
    fullName: asString(profileData.fullName, asString(identityData.fullName, "Perfil sin nombre")),
    municipality: asString(profileData.municipality, asString(identityData.municipality)),
    avatarUrl: asString(profileData.avatarUrl, asString(identityData.avatarUrl)),
    specialties: asStringArray(profileData.specialties),
    coverageAreas: asStringArray(profileData.coverageAreas),
    bio: asString(profileData.bio, "Sin biografía registrada."),
    experienceYears: asNumber(profileData.experienceYears),
    hourlyRate: asNumber(profileData.hourlyRate),
    verified: Boolean(profileData.verified),
    published: Boolean(profileData.published),
    ratingAvg: asNumber(profileData.ratingAvg),
    completedJobs: asNumber(profileData.completedJobs),
    distanceKm: asNumber(profileData.distanceKm),
    responseTime: asString(profileData.responseTime, "Sin tiempo de respuesta registrado"),
  };
}
