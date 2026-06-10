import { ensureWorkerProfile, fetchAdminCollections, fetchWorkerById, fetchWorkers, resolveVerificationStatus, syncPublicProfile } from "../../lib/firebase-data";
import type { UserProfile } from "../../lib/types";
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";

jest.mock("@/firebase", () => ({ db: {}, storage: {} }), { virtual: true });
jest.mock("../../firebase", () => ({ db: {}, storage: {} }));

jest.mock("firebase/storage", () => ({
  getDownloadURL: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn((_db, path: string) => ({ path })),
  doc: jest.fn((_db, path: string, id: string) => ({ path, id })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
  writeBatch: jest.fn(),
}));

const workerUser: UserProfile = {
  uid: "worker-1",
  role: "trabajador",
  fullName: "María Segura",
  phone: "3001234567",
  email: "maria@example.com",
  municipality: "Apartadó",
  avatarUrl: "https://example.com/avatar.jpg",
};

describe("contrato público de perfiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(writeBatch).mockReturnValue({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    } as never);
  });

  it("sincroniza identidad pública sin teléfono ni correo y la copia al perfil profesional", async () => {
    jest.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ specialties: ["Electricidad"] }),
    } as never);
    await syncPublicProfile(workerUser);

    const publicIdentity = {
      uid: "worker-1",
      role: "trabajador",
      fullName: "María Segura",
      municipality: "Apartadó",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    const batch = jest.mocked(writeBatch).mock.results[0].value as { set: jest.Mock; commit: jest.Mock };
    expect(batch.set).toHaveBeenCalledWith(
      { path: "publicProfiles", id: "worker-1" },
      publicIdentity,
      { merge: true },
    );
    expect(batch.set).toHaveBeenCalledWith(
      { path: "workerProfiles", id: "worker-1" },
      expect.objectContaining(publicIdentity),
      { merge: true },
    );
    expect(batch.set).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ phone: expect.anything(), email: expect.anything() }),
      expect.anything(),
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("lee el directorio y el perfil de trabajador sin consultar users", async () => {
    jest.mocked(getDocs).mockResolvedValue({
      docs: [
        {
          id: "worker-1",
          data: () => ({
            fullName: "María Segura",
            municipality: "Apartadó",
            avatarUrl: "avatar.jpg",
            specialties: ["Electricidad"],
            coverageAreas: ["Apartadó"],
          }),
        },
      ],
    } as never);
    jest.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: "María Segura",
        municipality: "Apartadó",
        avatarUrl: "avatar.jpg",
        specialties: ["Electricidad"],
        coverageAreas: ["Apartadó"],
      }),
    } as never);

    await fetchWorkers();
    await fetchWorkerById("worker-1");

    expect(collection).toHaveBeenCalledWith({}, "workerProfiles");
    expect(doc).toHaveBeenCalledWith({}, "workerProfiles", "worker-1");
    expect(doc).not.toHaveBeenCalledWith({}, "users", expect.any(String));
  });

  it("inicializa el perfil público sin permitir que el trabajador cree auditoría administrativa", async () => {
    await ensureWorkerProfile("worker-1", "Apartadó", workerUser);

    expect(setDoc).toHaveBeenCalledWith(
      { path: "workerProfiles", id: "worker-1" },
      expect.objectContaining({
        fullName: "María Segura",
        municipality: "Apartadó",
        verified: false,
        published: false,
        distanceKm: 0,
        responseTime: "Responde pronto",
      }),
      { merge: true },
    );
    expect(doc).not.toHaveBeenCalledWith({}, "workerVerifications", "worker-1");
  });

  it("consulta todos los perfiles de trabajador para administración sin reutilizar el filtro público", async () => {
    jest.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await fetchAdminCollections();

    expect(collection).toHaveBeenCalledWith({}, "workerProfiles");
    expect(getDocs).toHaveBeenCalledWith({ path: "workerProfiles" });
    expect(jest.mocked(getDocs).mock.calls.some(([target]) => target === undefined)).toBe(false);
  });

  it("resuelve la verificación desde la auditoría y usa el perfil solo para documentos heredados", () => {
    expect(resolveVerificationStatus({ verified: true }, null)).toBe("verified");
    expect(resolveVerificationStatus({ verified: true }, { status: "pending" })).toBe("pending");
    expect(resolveVerificationStatus({ verified: false }, { status: "rejected" })).toBe("rejected");
  });
});
