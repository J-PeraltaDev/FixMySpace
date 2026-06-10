import { fireEvent, render, screen } from "@testing-library/react";
import { SearchDirectory } from "../../components/SearchDirectory";
import { useCollection, type UseCollectionResult } from "../../hooks/useCollection";

jest.mock("../../hooks/useCollection", () => ({
  useCollection: jest.fn(),
}));

type CollectionDocument = Record<string, unknown> & { id?: string; uid?: string };

const mockUseCollection = jest.mocked(useCollection);

function collectionResult<T>(data: T[], overrides: Partial<UseCollectionResult<T>> = {}): UseCollectionResult<T> {
  return {
    data,
    loading: false,
    error: "",
    ...overrides,
  };
}

function mockCollections({
  workerProfiles = [],
  workersLoading = false,
  workersError = "",
}: {
  workerProfiles?: CollectionDocument[];
  workersLoading?: boolean;
  workersError?: string;
} = {}) {
  mockUseCollection.mockImplementation((path: string) => {
    if (path === "workerProfiles") {
      return collectionResult(workerProfiles, {
        loading: workersLoading,
        error: workersError,
      });
    }

    return collectionResult([]);
  });
}

function workerProfile(overrides: Partial<CollectionDocument> = {}): CollectionDocument {
  return {
    id: "worker-lina",
    specialties: ["Electricidad"],
    coverageAreas: ["Apartadó"],
    bio: "Instalaciones seguras para hogares.",
    experienceYears: 7,
    hourlyRate: 42000,
    verified: true,
    ratingAvg: 4.9,
    completedJobs: 118,
    distanceKm: 3.4,
    responseTime: "Responde en 12 min",
    ...overrides,
  };
}

describe("SearchDirectory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollections();
  });

  it("renders workers from Firestore collection data", () => {
    mockCollections({
      workerProfiles: [
        workerProfile({
          id: "worker-ana",
          fullName: "Ana Ruiz",
          municipality: "Apartadó",
        }),
      ],
    });

    render(<SearchDirectory />);

    expect(screen.getByRole("heading", { name: "Ana Ruiz" })).toBeInTheDocument();
    expect(screen.getByText("1 trabajadores encontrados")).toBeInTheDocument();
    expect(mockUseCollection).toHaveBeenCalledTimes(1);
    expect(mockUseCollection).toHaveBeenCalledWith(
      "workerProfiles",
      [{ field: "published", op: "==", value: true }],
      { limit: 24 },
    );
  });

  it("hides unverified workers when the verified-only filter is enabled", () => {
    mockCollections({
      workerProfiles: [
        workerProfile({ id: "worker-verified", fullName: "Clara Vera", verified: true }),
        workerProfile({ id: "worker-unverified", fullName: "Mario Paz", verified: false }),
      ],
    });

    render(<SearchDirectory />);

    expect(screen.getByRole("heading", { name: "Clara Vera" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mario Paz" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Solo verificados" }));

    expect(screen.getByRole("heading", { name: "Clara Vera" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mario Paz" })).not.toBeInTheDocument();
  });

  it("keeps category, municipality, rating, and rate filters working", () => {
    mockCollections({
      workerProfiles: [
        workerProfile({
          id: "worker-match",
          fullName: "Sofia Mesa",
          specialties: ["Plomería"],
          coverageAreas: ["Turbo"],
          municipality: "Carepa",
          ratingAvg: 4.9,
          hourlyRate: 45000,
        }),
        workerProfile({
          id: "worker-category",
          fullName: "Elena Diaz",
          specialties: ["Electricidad"],
          coverageAreas: ["Turbo"],
          municipality: "Carepa",
          ratingAvg: 4.9,
          hourlyRate: 45000,
        }),
        workerProfile({
          id: "worker-municipality",
          fullName: "Rosa Cano",
          specialties: ["Plomería"],
          coverageAreas: ["Necoclí"],
          municipality: "Necoclí",
          ratingAvg: 4.9,
          hourlyRate: 45000,
        }),
        workerProfile({
          id: "worker-rating",
          fullName: "Nora Gil",
          specialties: ["Plomería"],
          coverageAreas: ["Turbo"],
          municipality: "Carepa",
          ratingAvg: 4.4,
          hourlyRate: 45000,
        }),
        workerProfile({
          id: "worker-rate",
          fullName: "Paula Rey",
          specialties: ["Plomería"],
          coverageAreas: ["Turbo"],
          municipality: "Carepa",
          ratingAvg: 4.9,
          hourlyRate: 65000,
        }),
      ],
    });

    render(<SearchDirectory />);

    fireEvent.change(screen.getByLabelText("Oficio"), { target: { value: "Plomería" } });
    fireEvent.change(screen.getByLabelText("Municipio"), { target: { value: "Turbo" } });
    fireEvent.change(screen.getByLabelText("Calificación mínima"), { target: { value: "4.8" } });
    fireEvent.change(screen.getByRole("slider", { name: /Precio máximo por hora/ }), { target: { value: "50000" } });

    expect(screen.getByRole("heading", { name: "Sofia Mesa" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Elena Diaz" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rosa Cano" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nora Gil" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Paula Rey" })).not.toBeInTheDocument();
  });

  it("shows loading skeletons while collection data is loading", () => {
    mockCollections({ workersLoading: true });

    render(<SearchDirectory />);

    expect(screen.getByText("Buscando trabajadores...")).toBeInTheDocument();
    expect(screen.getAllByRole("status", { name: "Cargando" })).toHaveLength(2);
  });

  it("uses only fields stored in Firebase when a worker profile is incomplete", () => {
    mockCollections({
      workerProfiles: [
        workerProfile({
          id: "worker-lina",
          fullName: undefined,
          municipality: undefined,
          specialties: undefined,
        }),
      ],
    });

    render(<SearchDirectory />);

    expect(screen.getByRole("heading", { name: "Perfil sin nombre" })).toBeInTheDocument();
    expect(screen.getByText("Oficios por completar")).toBeInTheDocument();
    expect(mockUseCollection).toHaveBeenCalledTimes(1);
    expect(mockUseCollection).not.toHaveBeenCalledWith("users");
  });

  it("uses safe generic display defaults when a worker profile lacks fields and has no fallback match", () => {
    mockCollections({
      workerProfiles: [
        workerProfile({
          id: "worker-unknown",
          fullName: undefined,
          municipality: undefined,
          specialties: undefined,
          coverageAreas: undefined,
          bio: undefined,
          hourlyRate: undefined,
          ratingAvg: undefined,
        }),
      ],
    });

    render(<SearchDirectory />);

    expect(screen.getByRole("heading", { name: "Perfil sin nombre" })).toBeInTheDocument();
    expect(screen.getByText("Sin biografía registrada.")).toBeInTheDocument();
    expect(mockUseCollection).not.toHaveBeenCalledWith("users");
  });

  it("shows an empty state when Firebase has no published workers", () => {
    mockCollections({ workerProfiles: [] });

    render(<SearchDirectory />);

    expect(screen.getByText("Firebase")).toBeInTheDocument();
    expect(screen.getByText("No hay resultados con esos filtros")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lina Morales" })).not.toBeInTheDocument();
    expect(mockUseCollection).not.toHaveBeenCalledWith("users");
  });

  it("shows the Firebase error without rendering example workers", () => {
    mockCollections({ workersError: "No pudimos leer los datos en Firestore." });

    render(<SearchDirectory />);

    expect(screen.getByText("Firebase")).toBeInTheDocument();
    expect(screen.getByText("No pudimos leer los perfiles publicados desde Firestore.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lina Morales" })).not.toBeInTheDocument();
    expect(mockUseCollection).not.toHaveBeenCalledWith("users");
  });
});
