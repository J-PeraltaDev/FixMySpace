import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminPanel } from "../../components/AdminPanel";
import { useAuth } from "../../components/AuthProvider";
import type { AdminWorkerProfile, ServiceRequest, SupportReport, UserProfile } from "../../lib/types";
import { createNotification } from "../../lib/firebase-data";
import { arrayUnion, updateDoc, writeBatch } from "firebase/firestore";

jest.mock("../../components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/firebase", () => ({
  db: {},
}), { virtual: true });

jest.mock("../../firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, path: string, id: string) => ({ path, id })),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
  arrayUnion: jest.fn((value) => ({ arrayUnion: value })),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  writeBatch: jest.fn(),
}));

const adminProfile: UserProfile = {
  uid: "admin-1",
  role: "admin",
  fullName: "Admin Demo",
  phone: "3000000000",
  email: "admin@example.com",
  municipality: "Apartado",
};

const worker: AdminWorkerProfile = {
  uid: "worker-1",
  fullName: "Carlos Rios",
  municipality: "Apartado",
  avatarUrl: "",
  specialties: ["Electricidad"],
  coverageAreas: ["Apartado"],
  bio: "Instalaciones residenciales.",
  experienceYears: 8,
  hourlyRate: 50000,
  verified: false,
  verificationStatus: "pending",
  ratingAvg: 4.7,
  completedJobs: 30,
  distanceKm: 4,
  responseTime: "Responde en 20 min",
};

const request: ServiceRequest = {
  id: "request-1",
  clientId: "client-1",
  title: "Reparar fuga",
  description: "Hay una fuga persistente en la cocina.",
  category: "Plomería",
  municipality: "Apartado",
  address: "Calle 1",
  preferredDate: "2026-06-20",
  preferredTime: "09:00",
  photos: [],
  status: "pending",
};

const report: SupportReport = {
  id: "report-1",
  userId: "client-1",
  category: "servicio",
  subject: "Problema con servicio",
  message: "Necesito ayuda con el estado del servicio.",
  status: "open",
};

const fetchAdminCollections = jest.fn();

jest.mock("../../lib/firebase-data", () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  fetchAdminCollections: () => fetchAdminCollections(),
  serviceRequestStatuses: ["pending", "accepted", "scheduled", "completed", "cancelled"],
  timestampToText: jest.fn(() => "fecha mock"),
}));

describe("AdminPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(updateDoc).mockResolvedValue(undefined);
    jest.mocked(createNotification).mockResolvedValue(undefined);
    jest.mocked(useAuth).mockReturnValue({
      firebaseUser: null,
      profile: adminProfile,
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });
    fetchAdminCollections.mockResolvedValue({
      users: [adminProfile],
      workers: [worker],
      serviceRequests: [request],
      bookings: [],
      reviews: [],
      reports: [report],
      notifications: [],
    });
    jest.mocked(writeBatch).mockReturnValue({
      update: jest.fn(),
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    } as never);
  });

  it("smoke renders administrative metrics and worker verification queue", async () => {
    render(<AdminPanel />);

    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Carlos Rios" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verificación de trabajadores" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verificar" })).toBeInTheDocument();
    expect(screen.getByText("Usuarios").closest("article")).toHaveClass("metric-card");
    expect(screen.getByRole("combobox", { name: "Filtrar verificaciones" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Estado de Reparar fuga" })).toBeInTheDocument();
  });

  it("stores public verification state separately from private audit metadata", async () => {
    render(<AdminPanel />);
    await screen.findByRole("heading", { name: "Carlos Rios" });

    fireEvent.click(screen.getByRole("button", { name: "Verificar" }));

    const batch = jest.mocked(writeBatch).mock.results[0]?.value as {
      update: jest.Mock;
      set: jest.Mock;
      commit: jest.Mock;
    };
    await waitFor(() => expect(batch.commit).toHaveBeenCalled());
    expect(batch.set).toHaveBeenCalledWith(
        { path: "workerProfiles", id: "worker-1" },
        expect.objectContaining({
          verified: true,
          published: true,
          fullName: "Carlos Rios",
        }),
      );
    expect(batch.set).not.toHaveBeenCalledWith(
      { path: "workerProfiles", id: "worker-1" },
      expect.objectContaining({ verificationNotes: expect.anything() }),
      expect.anything(),
    );
    expect(batch.set).toHaveBeenCalledWith(
      { path: "workerVerifications", id: "worker-1" },
      {
        status: "verified",
        notes: "Perfil revisado y aprobado por administración.",
        reviewedAt: { serverTimestamp: true },
        reviewedBy: "admin-1",
      },
      { merge: true },
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Rechazar", "rejected"],
    ["Pendiente", "pending"],
  ] as const)("stores %s verification state and sends its notification", async (buttonName, nextStatus) => {
    render(<AdminPanel />);
    await screen.findByRole("heading", { name: "Carlos Rios" });

    fireEvent.click(screen.getByRole("button", { name: buttonName }));

    const batch = jest.mocked(writeBatch).mock.results[0]?.value as {
      update: jest.Mock;
      set: jest.Mock;
      commit: jest.Mock;
    };
    await waitFor(() => expect(batch.commit).toHaveBeenCalled());
    expect(batch.set).toHaveBeenCalledWith(
      { path: "workerProfiles", id: "worker-1" },
      expect.objectContaining({ verified: false, published: false }),
    );
    expect(batch.set).toHaveBeenCalledWith(
      { path: "workerVerifications", id: "worker-1" },
      expect.objectContaining({ status: nextStatus, reviewedBy: "admin-1" }),
      { merge: true },
    );
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "worker-1",
      type: "verification",
      title: "Verificación actualizada",
    }));
  });

  it("updates a service request status and notifies its client", async () => {
    render(<AdminPanel />);
    const statusSelect = await screen.findByDisplayValue("pending");

    fireEvent.change(statusSelect, { target: { value: "accepted" } });

    const batch = jest.mocked(writeBatch).mock.results[0]?.value as { update: jest.Mock; commit: jest.Mock };
    await waitFor(() => expect(batch.commit).toHaveBeenCalled());
    expect(batch.update).toHaveBeenCalledWith(
      { path: "serviceRequests", id: "request-1" },
      { status: "accepted", updatedAt: { serverTimestamp: true } },
    );
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "client-1",
      type: "serviceRequest",
      message: expect.stringContaining("accepted"),
    }));
  });

  it("propagates a completed request status to its booking and both history documents", async () => {
    fetchAdminCollections.mockResolvedValue({
      users: [adminProfile],
      workers: [worker],
      serviceRequests: [request],
      bookings: [{
        id: "booking-1",
        requestId: "request-1",
        clientId: "client-1",
        workerId: "worker-1",
        scheduledAt: "2026-06-20 09:00",
        status: "scheduled",
        notes: "Reparar fuga",
      }],
      reviews: [],
      reports: [report],
      notifications: [],
    });

    render(<AdminPanel />);
    fireEvent.change(await screen.findByDisplayValue("pending"), { target: { value: "completed" } });

    const batch = jest.mocked(writeBatch).mock.results[0]?.value as { set: jest.Mock; update: jest.Mock; commit: jest.Mock };
    await waitFor(() => expect(batch.commit).toHaveBeenCalled());
    expect(batch.update).toHaveBeenCalledWith(
      { path: "serviceRequests", id: "request-1" },
      { status: "completed", updatedAt: { serverTimestamp: true } },
    );
    expect(batch.update).toHaveBeenCalledWith(
      { path: "bookings", id: "booking-1" },
      { status: "completed", updatedAt: { serverTimestamp: true } },
    );
    expect(batch.set).toHaveBeenCalledWith(
      { path: "jobHistory", id: "booking-1_client-1" },
      expect.objectContaining({ status: "completed", events: { arrayUnion: "Estado actualizado por administración: completed" } }),
      { merge: true },
    );
    expect(batch.set).toHaveBeenCalledWith(
      { path: "jobHistory", id: "booking-1_worker-1" },
      expect.objectContaining({ status: "completed" }),
      { merge: true },
    );
    expect(arrayUnion).toHaveBeenCalledWith("Estado actualizado por administración: completed");
  });

  it("attends a support report and notifies its owner", async () => {
    render(<AdminPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar atendido" }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
      { path: "supportReports", id: "report-1" },
      { status: "attended", updatedAt: { serverTimestamp: true } },
    ));
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "client-1",
      type: "support",
      title: "Reporte atendido",
    }));
  });

  it("shows a verification error and does not notify when the batch fails", async () => {
    const failingBatch = {
      update: jest.fn(),
      set: jest.fn(),
      commit: jest.fn().mockRejectedValue(new Error("batch failed")),
    };
    jest.mocked(writeBatch).mockReturnValue(failingBatch as never);

    render(<AdminPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Verificar" }));

    expect(await screen.findByText("No pudimos actualizar la verificación.")).toBeInTheDocument();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("shows request and report errors when their writes fail", async () => {
    jest.mocked(writeBatch).mockReturnValueOnce({
      update: jest.fn(),
      set: jest.fn(),
      commit: jest.fn().mockRejectedValue(new Error("write failed")),
    } as never);
    jest.mocked(updateDoc).mockRejectedValue(new Error("write failed"));
    render(<AdminPanel />);

    fireEvent.change(await screen.findByDisplayValue("pending"), { target: { value: "accepted" } });
    expect(await screen.findByText("No pudimos actualizar la solicitud.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Marcar atendido" }));
    expect(await screen.findByText("No pudimos marcar el reporte como atendido.")).toBeInTheDocument();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("keeps the request update successful when its notification fails", async () => {
    jest.mocked(createNotification).mockRejectedValue(new Error("notification failed"));
    render(<AdminPanel />);

    fireEvent.change(await screen.findByDisplayValue("pending"), { target: { value: "accepted" } });

    expect(await screen.findByText("Estado actualizado. No pudimos enviar la notificación.")).toBeInTheDocument();
    const batch = jest.mocked(writeBatch).mock.results[0]?.value as { update: jest.Mock; commit: jest.Mock };
    expect(batch.update).toHaveBeenCalledWith(
      { path: "serviceRequests", id: "request-1" },
      { status: "accepted", updatedAt: { serverTimestamp: true } },
    );
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "client-1",
      type: "serviceRequest",
    }));
  });
});
