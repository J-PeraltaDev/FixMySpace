import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { writeBatch } from "firebase/firestore";
import { ProfileForm } from "../../components/ProfileForm";
import { useAuth } from "../../components/AuthProvider";
import { createNotification } from "../../lib/firebase-data";

jest.mock("../../components/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("@/firebase", () => ({ db: {} }), { virtual: true });
jest.mock("../../firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, path, id) => ({ path, id })),
  getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ verified: false, published: false }) }),
  writeBatch: jest.fn(),
}));
jest.mock("../../lib/firebase-data", () => ({
  buildPublicProfile: jest.fn((profile) => ({
    uid: profile.uid,
    role: profile.role,
    fullName: profile.fullName,
    municipality: profile.municipality,
    avatarUrl: profile.avatarUrl || "",
  })),
  createNotification: jest.fn().mockResolvedValue(undefined),
  ensureWorkerProfile: jest.fn(),
  resolveVerificationStatus: jest.fn((workerProfile, verification) => verification?.status || (workerProfile?.verified ? "verified" : "pending")),
}));

describe("ProfileForm", () => {
  const updateLocalProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      firebaseUser: null,
      profile: {
        uid: "worker-1",
        role: "trabajador",
        fullName: "Trabajador",
        phone: "3000000000",
        email: "worker@example.com",
        municipality: "Apartadó",
        avatarUrl: "",
      },
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile,
    });
    jest.mocked(writeBatch).mockReturnValue({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    } as never);
    jest.mocked(createNotification).mockResolvedValue(undefined);
  });

  it("commits private, public, and worker profile writes in one batch", async () => {
    render(<ProfileForm />);
    fireEvent.click(await screen.findByRole("button", { name: "Guardar perfil" }));

    const batch = jest.mocked(writeBatch).mock.results[0].value as { set: jest.Mock; commit: jest.Mock };
    await waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(1));
    expect(batch.set).toHaveBeenCalledWith({ path: "users", id: "worker-1" }, expect.anything(), { merge: true });
    expect(batch.set).toHaveBeenCalledWith({ path: "publicProfiles", id: "worker-1" }, expect.anything(), { merge: true });
    expect(batch.set).toHaveBeenCalledWith({ path: "workerProfiles", id: "worker-1" }, expect.objectContaining({ uid: "worker-1" }), { merge: true });
    expect(await screen.findByRole("status")).toHaveTextContent("Perfil actualizado correctamente.");
  });

  it("keeps core success accessible when notification delivery fails", async () => {
    jest.mocked(createNotification).mockRejectedValue(new Error("notification failed"));
    render(<ProfileForm />);
    fireEvent.click(await screen.findByRole("button", { name: "Guardar perfil" }));

    expect(await screen.findByRole("status")).toHaveTextContent("No pudimos enviar la notificación.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
