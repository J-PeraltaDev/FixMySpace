import { render, screen, waitFor } from "@testing-library/react";
import { MessagesInbox } from "../../components/MessagesInbox";
import { useAuth } from "../../components/AuthProvider";
import { useCollection, type UseCollectionResult } from "../../hooks/useCollection";
import type { Conversation, UserProfile } from "../../lib/types";
import { doc, getDoc } from "firebase/firestore";

jest.mock("../../components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../hooks/useCollection", () => ({
  useCollection: jest.fn(),
}));

jest.mock("../../lib/firebase-data", () => ({
  timestampToText: jest.fn(() => "fecha mock"),
}));

jest.mock("@/firebase", () => ({
  db: {},
}), { virtual: true });

jest.mock("../../firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn((_db, path: string, id: string) => ({ id, path })),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  query: jest.fn(),
  where: jest.fn(),
}));

const mockUseAuth = jest.mocked(useAuth);
const mockUseCollection = jest.mocked(useCollection);
const mockDoc = jest.mocked(doc);
const mockGetDoc = jest.mocked(getDoc);

function collectionResult<T>(data: T[], overrides: Partial<UseCollectionResult<T>> = {}): UseCollectionResult<T> {
  return {
    data,
    loading: false,
    error: "",
    ...overrides,
  };
}

function timestamp(milliseconds: number) {
  return {
    toMillis: () => milliseconds,
  };
}

const clientProfile: UserProfile = {
  uid: "client-1",
  role: "cliente",
  fullName: "Cliente Demo",
  phone: "3000000000",
  email: "cliente@example.com",
  municipality: "Apartado",
};

const conversations: Conversation[] = [
  {
    id: "conversation-old",
    participantIds: ["client-1", "worker-old"],
    lastMessage: "Mensaje viejo",
    updatedAt: timestamp(100),
  },
  {
    id: "conversation-new",
    participantIds: ["worker-new", "client-1"],
    lastMessage: "Mensaje nuevo",
    updatedAt: timestamp(200),
  },
];

describe("MessagesInbox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      firebaseUser: null,
      profile: clientProfile,
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });
    mockUseCollection.mockReturnValue(collectionResult(conversations));
    mockGetDoc.mockImplementation(async (reference) => {
      const partnerId = (reference as { id: string }).id;
      return {
        exists: () => true,
        data: () => ({
          fullName: partnerId === "worker-new" ? "Nueva Persona" : "Vieja Persona",
          role: "trabajador",
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>;
    });
  });

  it("renders sorted hook-fed conversations with targeted public profile lookups", async () => {
    render(<MessagesInbox />);

    await screen.findByRole("heading", { name: "Nueva Persona" });

    const headings = screen.getAllByRole("heading");
    expect(headings.map((heading) => heading.textContent)).toEqual(["Nueva Persona", "Vieja Persona"]);
    expect(screen.getByText("Mensaje nuevo")).toBeInTheDocument();
    expect(screen.getByText("Mensaje viejo")).toBeInTheDocument();

    expect(mockUseCollection).toHaveBeenCalledWith(
      "conversations",
      [{ field: "participantIds", op: "array-contains", value: "client-1" }],
      { enabled: true },
    );
    expect(mockUseCollection).not.toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith({}, "publicProfiles", "worker-new");
    expect(mockDoc).toHaveBeenCalledWith({}, "publicProfiles", "worker-old");
    expect(mockDoc).not.toHaveBeenCalledWith({}, "users", expect.any(String));
    await waitFor(() => expect(mockGetDoc).toHaveBeenCalledTimes(2));
  });

  it("reports missing Firebase identity without showing generic role labels", async () => {
    mockGetDoc.mockImplementation(async (reference) => {
      const partnerId = (reference as { id: string }).id;
      if (partnerId === "worker-new") {
        throw new Error("lookup failed");
      }

      return {
        exists: () => true,
        data: () => ({
          fullName: "Vieja Persona",
          role: "trabajador",
        }),
      } as unknown as Awaited<ReturnType<typeof getDoc>>;
    });

    render(<MessagesInbox />);

    await screen.findByRole("heading", { name: "Perfil no disponible" });

    expect(screen.getByRole("heading", { name: "Perfil no disponible" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vieja Persona" })).toBeInTheDocument();
    expect(screen.queryByText("usuario")).not.toBeInTheDocument();
    expect(screen.queryByText("No pudimos preparar la lista de mensajes.")).not.toBeInTheDocument();
  });

  it("disables conversation reads when there is no profile", () => {
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
    mockUseCollection.mockReturnValue(collectionResult([]));

    render(<MessagesInbox />);

    expect(mockUseCollection).toHaveBeenCalledWith(
      "conversations",
      [{ field: "participantIds", op: "array-contains", value: "" }],
      { enabled: false },
    );
  });
});
