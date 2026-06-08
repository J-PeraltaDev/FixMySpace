import { render, screen } from "@testing-library/react";
import { AdminPanel } from "../../components/AdminPanel";
import { useAuth } from "../../components/AuthProvider";
import type { UserProfile, WorkerProfile } from "../../lib/types";

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
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
  updateDoc: jest.fn(),
}));

const adminProfile: UserProfile = {
  uid: "admin-1",
  role: "admin",
  fullName: "Admin Demo",
  phone: "3000000000",
  email: "admin@example.com",
  municipality: "Apartado",
};

const worker: WorkerProfile = {
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

const fetchAdminCollections = jest.fn();

jest.mock("../../lib/firebase-data", () => ({
  createNotification: jest.fn(),
  fetchAdminCollections: () => fetchAdminCollections(),
  serviceRequestStatuses: ["pending", "accepted", "scheduled", "completed", "cancelled"],
  timestampToText: jest.fn(() => "fecha mock"),
}));

describe("AdminPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      serviceRequests: [],
      bookings: [],
      reviews: [],
      reports: [],
      notifications: [],
    });
  });

  it("smoke renders administrative metrics and worker verification queue", async () => {
    render(<AdminPanel />);

    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Carlos Rios" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verificación de trabajadores" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verificar" })).toBeInTheDocument();
  });
});
