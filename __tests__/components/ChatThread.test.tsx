import { render, screen } from "@testing-library/react";
import { ChatThread } from "../../components/ChatThread";
import { useAuth } from "../../components/AuthProvider";
import type { UserProfile } from "../../lib/types";

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
  addDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn((_db, path: string, id: string) => ({ id, path })),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
  onSnapshot: jest.fn((_target, onNext) => {
    onNext({ docs: [] });
    return jest.fn();
  }),
  query: jest.fn(),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
  setDoc: jest.fn().mockResolvedValue(undefined),
  where: jest.fn(),
}));

jest.mock("../../lib/firebase-data", () => ({
  createNotification: jest.fn(),
  fetchWorkerById: jest.fn().mockResolvedValue({
    uid: "worker-1",
    fullName: "Ana Ruiz",
    municipality: "Apartado",
    avatarUrl: "",
    specialties: ["Plomeria"],
    coverageAreas: ["Apartado"],
    bio: "Servicios residenciales.",
    experienceYears: 6,
    hourlyRate: 45000,
    verified: true,
    ratingAvg: 4.8,
    completedJobs: 42,
    distanceKm: 2,
    responseTime: "Responde en 15 min",
  }),
  timestampToText: jest.fn(() => "Sin fecha"),
}));

const profile: UserProfile = {
  uid: "client-1",
  role: "cliente",
  fullName: "Cliente Demo",
  phone: "3000000000",
  email: "cliente@example.com",
  municipality: "Apartado",
};

describe("ChatThread", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      firebaseUser: null,
      profile,
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });
  });

  it("smoke renders the chat shell and composer", async () => {
    render(<ChatThread conversationId="worker-1" />);

    expect(await screen.findByRole("heading", { name: "Ana Ruiz" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Escribe un mensaje")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });
});
