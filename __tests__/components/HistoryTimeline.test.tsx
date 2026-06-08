import { render, screen } from "@testing-library/react";
import { HistoryTimeline } from "../../components/HistoryTimeline";
import { useAuth } from "../../components/AuthProvider";
import { useCollection, type UseCollectionResult } from "../../hooks/useCollection";
import type { Booking, JobHistory, UserProfile } from "../../lib/types";

jest.mock("../../components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../hooks/useCollection", () => ({
  useCollection: jest.fn(),
}));

jest.mock("../../components/EvidenceManager", () => ({
  EvidenceManager: ({ bookingId }: { bookingId: string }) => <div>Evidencia {bookingId}</div>,
}));

jest.mock("../../lib/firebase-data", () => ({
  timestampToText: jest.fn(() => "fecha mock"),
}));

const mockUseAuth = jest.mocked(useAuth);
const mockUseCollection = jest.mocked(useCollection);

function collectionResult<T>(data: T[], overrides: Partial<UseCollectionResult<T>> = {}): UseCollectionResult<T> {
  return {
    data,
    loading: false,
    error: "",
    ...overrides,
  };
}

const workerProfile: UserProfile = {
  uid: "worker-1",
  role: "trabajador",
  fullName: "Lina Morales",
  phone: "3000000000",
  email: "lina@example.com",
  municipality: "Apartado",
};

const historyRow: JobHistory = {
  id: "history-1",
  bookingId: "booking-1",
  userId: "worker-1",
  service: "Servicio terminado",
  status: "completed",
  workerId: "worker-1",
  clientId: "client-1",
  events: ["Diagnostico registrado"],
};

const booking: Booking = {
  id: "booking-2",
  requestId: "request-2",
  clientId: "client-1",
  workerId: "worker-1",
  scheduledAt: "2026-06-11 10:00",
  status: "scheduled",
  notes: "Servicio fallback desde booking",
};

function mockCollections({
  history = [historyRow],
  historyLoading = false,
  historyError = "",
  bookings = [booking],
  bookingsLoading = false,
  bookingsError = "",
}: {
  history?: JobHistory[];
  historyLoading?: boolean;
  historyError?: string;
  bookings?: Booking[];
  bookingsLoading?: boolean;
  bookingsError?: string;
} = {}) {
  mockUseCollection.mockImplementation((path: string) => {
    if (path === "jobHistory") {
      return collectionResult(history, { loading: historyLoading, error: historyError });
    }
    if (path === "bookings") {
      return collectionResult(bookings, { loading: bookingsLoading, error: bookingsError });
    }
    return collectionResult([]);
  });
}

describe("HistoryTimeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      firebaseUser: null,
      profile: workerProfile,
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });
    mockCollections();
  });

  it("renders non-empty history while bookings are still loading", () => {
    mockCollections({ bookings: [], bookingsLoading: true });

    render(<HistoryTimeline />);

    expect(screen.getByRole("heading", { name: "Servicio terminado" })).toBeInTheDocument();
    expect(screen.getByText("Diagnostico registrado")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Cargando" })).not.toBeInTheDocument();
  });

  it("keeps non-empty history visible when bookings fail", () => {
    mockCollections({ bookings: [], bookingsError: "No pudimos leer los datos en Firestore." });

    render(<HistoryTimeline />);

    expect(screen.getByRole("heading", { name: "Servicio terminado" })).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar tu historial desde Firestore.")).not.toBeInTheDocument();
  });

  it("waits for bookings fallback when history is empty", () => {
    mockCollections({ history: [], bookings: [], bookingsLoading: true });

    render(<HistoryTimeline />);

    expect(screen.getAllByRole("status", { name: "Cargando" })).toHaveLength(2);
    expect(screen.queryByText("Tu historial está vacío")).not.toBeInTheDocument();
  });

  it("renders booking fallback rows when history is empty and bookings load", () => {
    mockCollections({ history: [], bookings: [booking] });

    render(<HistoryTimeline />);

    expect(screen.getByRole("heading", { name: "Servicio fallback desde booking" })).toBeInTheDocument();
    expect(screen.getByText("Evidencia booking-2")).toBeInTheDocument();
  });

  it("uses role-aware history and booking filters", () => {
    render(<HistoryTimeline />);

    expect(mockUseCollection).toHaveBeenCalledWith(
      "jobHistory",
      [{ field: "userId", op: "==", value: "worker-1" }],
      { enabled: true },
    );
    expect(mockUseCollection).toHaveBeenCalledWith(
      "bookings",
      [{ field: "workerId", op: "==", value: "worker-1" }],
      { enabled: true },
    );
  });

  it("disables history collection reads when there is no profile", () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: null,
      profile: null,
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });

    render(<HistoryTimeline />);

    expect(mockUseCollection).toHaveBeenCalledWith(
      "jobHistory",
      [{ field: "userId", op: "==", value: "" }],
      { enabled: false },
    );
    expect(mockUseCollection).toHaveBeenCalledWith(
      "bookings",
      [{ field: "clientId", op: "==", value: "" }],
      { enabled: false },
    );
  });
});
