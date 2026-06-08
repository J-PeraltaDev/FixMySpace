import { render, screen } from "@testing-library/react";
import { DashboardView } from "../../components/DashboardView";
import { useAuth } from "../../components/AuthProvider";
import { useCollection, type UseCollectionResult } from "../../hooks/useCollection";
import type { Booking, Notification, ServiceRequest, UserProfile } from "../../lib/types";

jest.mock("../../components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../hooks/useCollection", () => ({
  useCollection: jest.fn(),
}));

jest.mock("../../lib/firebase-data", () => ({
  fetchUserBookings: jest.fn().mockResolvedValue([]),
  fetchUserRequests: jest.fn().mockResolvedValue([]),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock("@/firebase", () => ({
  db: {},
}), { virtual: true });

jest.mock("../../firebase", () => ({
  db: {},
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

const booking: Booking = {
  id: "booking-1",
  requestId: "request-1",
  clientId: "client-1",
  workerId: "worker-1",
  scheduledAt: "2026-06-10 09:00",
  status: "scheduled",
  notes: "Reparacion de tuberia",
};

const request: ServiceRequest = {
  id: "request-1",
  clientId: "client-1",
  workerId: "worker-1",
  title: "Arreglar lavamanos",
  description: "Hay una fuga debajo del lavamanos.",
  category: "Plomeria",
  municipality: "Apartado",
  address: "Calle 1",
  preferredDate: "2026-06-10",
  preferredTime: "09:00",
  photos: [],
  status: "scheduled",
};

const notifications: Notification[] = [
  {
    id: "notification-1",
    userId: "worker-1",
    type: "message",
    title: "Nuevo mensaje",
    message: "Tienes un mensaje",
    read: false,
  },
];

describe("DashboardView", () => {
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
    mockUseCollection.mockImplementation((path: string) => {
      if (path === "bookings") return collectionResult([booking]);
      if (path === "serviceRequests") return collectionResult([request]);
      if (path === "notifications") return collectionResult(notifications);
      return collectionResult([]);
    });
  });

  it("renders worker dashboard data from role-aware useCollection hooks", () => {
    render(<DashboardView />);

    expect(screen.getByText("Reparacion de tuberia")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Arreglar lavamanos" })).toBeInTheDocument();
    expect(screen.getAllByText("Mensaje al cliente")).toHaveLength(2);

    expect(mockUseCollection).toHaveBeenCalledWith(
      "bookings",
      [{ field: "workerId", op: "==", value: "worker-1" }],
      { enabled: true },
    );
    expect(mockUseCollection).toHaveBeenCalledWith(
      "serviceRequests",
      [{ field: "workerId", op: "==", value: "worker-1" }],
      { enabled: true },
    );
    expect(mockUseCollection).toHaveBeenCalledWith(
      "notifications",
      [{ field: "userId", op: "==", value: "worker-1" }],
      { enabled: true },
    );
  });

  it("renders loaded bookings while requests are still loading", () => {
    mockUseCollection.mockImplementation((path: string) => {
      if (path === "bookings") return collectionResult([booking]);
      if (path === "serviceRequests") return collectionResult<ServiceRequest>([], { loading: true });
      if (path === "notifications") return collectionResult(notifications);
      return collectionResult([]);
    });

    render(<DashboardView />);

    expect(screen.getByText("Reparacion de tuberia")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Arreglar lavamanos" })).not.toBeInTheDocument();
  });

  it("renders loaded requests while bookings are still loading", () => {
    mockUseCollection.mockImplementation((path: string) => {
      if (path === "bookings") return collectionResult<Booking>([], { loading: true });
      if (path === "serviceRequests") return collectionResult([request]);
      if (path === "notifications") return collectionResult(notifications);
      return collectionResult([]);
    });

    render(<DashboardView />);

    expect(screen.getByRole("heading", { name: "Arreglar lavamanos" })).toBeInTheDocument();
    expect(screen.queryByText("Reparacion de tuberia")).not.toBeInTheDocument();
  });

  it("uses client role filters for client dashboards", () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: null,
      profile: { ...workerProfile, role: "cliente", uid: "client-1" },
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });

    render(<DashboardView />);

    expect(mockUseCollection).toHaveBeenCalledWith(
      "bookings",
      [{ field: "clientId", op: "==", value: "client-1" }],
      { enabled: true },
    );
    expect(mockUseCollection).toHaveBeenCalledWith(
      "serviceRequests",
      [{ field: "clientId", op: "==", value: "client-1" }],
      { enabled: true },
    );
  });

  it("disables dashboard collection reads when there is no profile", () => {
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

    render(<DashboardView />);

    expect(mockUseCollection).toHaveBeenCalledWith(
      "bookings",
      [{ field: "clientId", op: "==", value: "" }],
      { enabled: false },
    );
    expect(mockUseCollection).toHaveBeenCalledWith(
      "serviceRequests",
      [{ field: "clientId", op: "==", value: "" }],
      { enabled: false },
    );
    expect(mockUseCollection).toHaveBeenCalledWith(
      "notifications",
      [{ field: "userId", op: "==", value: "" }],
      { enabled: false },
    );
  });
});
