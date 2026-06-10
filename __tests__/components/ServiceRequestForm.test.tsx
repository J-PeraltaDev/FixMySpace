import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { collection } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { ServiceRequestForm } from "../../components/ServiceRequestForm";
import { useAuth } from "../../components/AuthProvider";
import { createNotification, fetchWorkerById, uploadImage } from "../../lib/firebase-data";
import type { UserProfile, WorkerProfile } from "../../lib/types";

jest.mock("../../components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/firebase", () => ({
  db: {},
  storage: {},
}), { virtual: true });

jest.mock("../../firebase", () => ({
  db: {},
  storage: {},
}));

jest.mock("firebase/storage", () => ({
  deleteObject: jest.fn(),
  ref: jest.fn((_storage, url: string) => ({ url })),
}));

const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((_db, path: string) => ({ path })),
  doc: jest.fn((first: { path?: string }, path?: string, id?: string) => (
    path === undefined
      ? { id: `generated-${first.path}`, path: first.path }
      : { id, path }
  )),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
  setDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    set: mockBatchSet,
    commit: mockBatchCommit,
  })),
}));

jest.mock("../../lib/firebase-data", () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  fetchWorkerById: jest.fn().mockResolvedValue(undefined),
  uploadImage: jest.fn(),
}));

const clientProfile: UserProfile = {
  uid: "client-1",
  role: "cliente",
  fullName: "Cliente Demo",
  phone: "3000000000",
  email: "cliente@example.com",
  municipality: "Apartadó",
};

const workersForTest = {
  workerLina: {
    uid: "worker-lina",
    fullName: "Lina Morales",
    municipality: "Apartadó",
    avatarUrl: "",
    specialties: ["Electricidad"],
    coverageAreas: ["Apartadó"],
    bio: "Instalaciones residenciales.",
    experienceYears: 7,
    hourlyRate: 42000,
    verified: true,
    ratingAvg: 4.9,
    completedJobs: 118,
    distanceKm: 3,
    responseTime: "Responde pronto",
  } satisfies WorkerProfile,
  workerB: {
    uid: "worker-b",
    fullName: "Trabajador B",
    municipality: "Carepa",
    avatarUrl: "",
    specialties: ["Plomería"],
    coverageAreas: ["Carepa"],
    bio: "Servicios residenciales.",
    experienceYears: 5,
    hourlyRate: 45000,
    verified: true,
    ratingAvg: 4.7,
    completedJobs: 30,
    distanceKm: 4,
    responseTime: "Responde pronto",
  } satisfies WorkerProfile,
};

const mockCollection = jest.mocked(collection);
const mockCreateNotification = jest.mocked(createNotification);
const mockDeleteObject = jest.mocked(deleteObject);
const mockFetchWorkerById = jest.mocked(fetchWorkerById);
const mockStorageRef = jest.mocked(ref);
const mockUploadImage = jest.mocked(uploadImage);
let currentProfile: UserProfile | null = clientProfile;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function collectionPaths() {
  return mockCollection.mock.calls.map((call) => (call[1] as string));
}

function batchPayload(path: string) {
  return mockBatchSet.mock.calls.find(([reference]) => reference.path === path)?.[1];
}

function fillValidForm() {
  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Reparar fuga" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Descripción" }), {
    target: { value: "Hay una fuga constante debajo del lavaplatos." },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Categoría" }), {
    target: { value: "Plomería" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Municipio" }), {
    target: { value: "Apartadó" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Dirección o referencia" }), {
    target: { value: "Calle 10" },
  });
  fireEvent.change(screen.getByLabelText("Fecha"), {
    target: { value: "2026-06-15" },
  });
  fireEvent.change(screen.getByLabelText("Hora"), {
    target: { value: "09:30" },
  });
}

describe("ServiceRequestForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentProfile = clientProfile;
    jest.mocked(useAuth).mockReturnValue({
      firebaseUser: null,
      get profile() {
        return currentProfile;
      },
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });
    mockCreateNotification.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
    mockFetchWorkerById.mockResolvedValue(null);
    mockBatchCommit.mockResolvedValue(undefined);
    mockUploadImage.mockResolvedValue("");
  });

  it("keeps submit disabled initially and until every required field is valid", async () => {
    render(<ServiceRequestForm />);

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "Reparar fuga" },
    });

    await waitFor(() => expect(submit).toBeDisabled());
  });

  it("shows the exact minimum description error associated with its field", async () => {
    render(<ServiceRequestForm />);

    const description = screen.getByRole("textbox", { name: "Descripción" });
    fireEvent.change(description, { target: { value: "Muy corta" } });

    const error = await screen.findByText("La descripción debe tener al menos 20 caracteres.");
    expect(error).toHaveAttribute("role", "alert");
    expect(description).toHaveAccessibleDescription("La descripción debe tener al menos 20 caracteres.");
    expect(description).toHaveAttribute("aria-invalid", "true");
  });

  it("renders field-specific errors near and associated with invalid fields", async () => {
    render(<ServiceRequestForm />);

    const title = screen.getByRole("textbox", { name: "Título" });
    const address = screen.getByRole("textbox", { name: "Dirección o referencia" });
    fireEvent.change(title, { target: { value: "abc" } });
    fireEvent.change(address, { target: { value: "x" } });

    const titleError = await screen.findByText("El título debe tener al menos 5 caracteres.");
    const addressError = await screen.findByText("La dirección debe tener al menos 5 caracteres.");

    expect(title).toHaveAttribute("aria-describedby", titleError.id);
    expect(address).toHaveAttribute("aria-describedby", addressError.id);
    expect(titleError.parentElement).toContainElement(title);
    expect(addressError.parentElement).toContainElement(address);
  });

  it("rejects whitespace-only trimmed text fields", async () => {
    render(<ServiceRequestForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "     " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción" }), {
      target: { value: "                    " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Dirección o referencia" }), {
      target: { value: "     " },
    });

    expect(await screen.findByText("El título debe tener al menos 5 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("La descripción debe tener al menos 20 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("La dirección debe tener al menos 5 caracteres.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar solicitud" })).toBeDisabled();
  });

  it("shows exact required errors for category, municipality, date, and time", async () => {
    render(<ServiceRequestForm />);

    const category = screen.getByRole("combobox", { name: "Categoría" });
    const municipality = screen.getByRole("combobox", { name: "Municipio" });
    const date = screen.getByLabelText("Fecha");
    const time = screen.getByLabelText("Hora");

    fireEvent.change(category, { target: { value: "Plomería" } });
    fireEvent.change(category, { target: { value: "" } });
    fireEvent.change(municipality, { target: { value: "Turbo" } });
    fireEvent.change(municipality, { target: { value: "" } });
    fireEvent.change(date, { target: { value: "2026-06-15" } });
    fireEvent.change(date, { target: { value: "" } });
    fireEvent.change(time, { target: { value: "09:30" } });
    fireEvent.change(time, { target: { value: "" } });

    expect(await screen.findByText("Selecciona una categoría.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona un municipio.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona una fecha.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona una hora.")).toBeInTheDocument();
  });

  it("enables submit after all required fields are valid", async () => {
    render(<ServiceRequestForm />);

    fillValidForm();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Publicar solicitud" })).toBeEnabled();
    });
  });

  it("trims valid title, description, and address before writing the request", async () => {
    render(<ServiceRequestForm />);
    fillValidForm();

    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "  Reparar fuga  " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción" }), {
      target: { value: "  Hay una fuga constante debajo del lavaplatos.  " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Dirección o referencia" }), {
      target: { value: "  Calle 10  " },
    });

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await screen.findByRole("status");
    expect(batchPayload("serviceRequests")).toEqual(expect.objectContaining({
      title: "Reparar fuga",
      description: "Hay una fuga constante debajo del lavaplatos.",
      address: "Calle 10",
    }));
  });

  it("does not overwrite dirty category and municipality when async defaults arrive", async () => {
    const workerResult = deferred<WorkerProfile | null>();
    mockFetchWorkerById.mockReturnValue(workerResult.promise);
    currentProfile = null;

    const { rerender } = render(<ServiceRequestForm workerId="worker-async" />);
    const category = screen.getByRole("combobox", { name: "Categoría" });
    const municipality = screen.getByRole("combobox", { name: "Municipio" });
    const title = screen.getByRole("textbox", { name: "Título" });

    fireEvent.change(category, { target: { value: "Pintura" } });
    fireEvent.change(municipality, { target: { value: "Turbo" } });
    fireEvent.change(title, { target: { value: "Título escrito por usuario" } });

    await act(async () => {
      workerResult.resolve({
        uid: "worker-async",
        fullName: "Trabajador Async",
        municipality: "Carepa",
        avatarUrl: "",
        specialties: ["Electricidad"],
        coverageAreas: ["Carepa"],
        bio: "Servicios residenciales.",
        experienceYears: 4,
        hourlyRate: 40000,
        verified: true,
        ratingAvg: 4.8,
        completedJobs: 20,
        distanceKm: 3,
        responseTime: "Responde pronto",
      });
    });
    currentProfile = { ...clientProfile, municipality: "Necoclí" };
    rerender(<ServiceRequestForm workerId="worker-async" />);
    rerender(<ServiceRequestForm workerId="worker-async" />);

    await screen.findByText("Trabajador Async");
    expect(category).toHaveValue("Pintura");
    expect(municipality).toHaveValue("Turbo");
    expect(title).toHaveValue("Título escrito por usuario");
    expect(mockFetchWorkerById).toHaveBeenCalledTimes(1);
  });

  it("uses the first supported worker specialty and leaves unsupported-only specialties empty", async () => {
    mockFetchWorkerById.mockResolvedValueOnce({
      ...workersForTest.workerB,
      specialties: ["Especialidad externa", "Plomería"],
    });
    const { rerender } = render(<ServiceRequestForm workerId="worker-supported" />);

    await screen.findByText("Trabajador B");
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("Plomería");

    mockFetchWorkerById.mockResolvedValueOnce({
      ...workersForTest.workerB,
      uid: "worker-unsupported",
      specialties: ["Especialidad externa"],
    });
    rerender(<ServiceRequestForm workerId="worker-unsupported" />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("");
    });
  });

  it("clears and gates the previous worker while a new worker resolves to null", async () => {
    const workerResult = deferred<WorkerProfile | null>();
    mockFetchWorkerById.mockResolvedValueOnce(null);
    const { rerender } = render(<ServiceRequestForm workerId="worker-lina" />);
    await act(async () => {});
    fillValidForm();

    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar solicitud" })).toBeEnabled());
    mockFetchWorkerById.mockReturnValue(workerResult.promise);
    rerender(<ServiceRequestForm workerId="worker-missing" />);

    expect(screen.queryByText("Lina Morales")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar solicitud" })).toBeDisabled();

    await act(async () => {
      workerResult.resolve(null);
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "Publicar solicitud" })).toBeEnabled());
    expect(screen.queryByText("Lina Morales")).not.toBeInTheDocument();
  });

  it("replaces worker A with worker B only after worker B resolves", async () => {
    const workerResult = deferred<WorkerProfile | null>();
    mockFetchWorkerById.mockResolvedValueOnce(null);
    const { rerender } = render(<ServiceRequestForm workerId="worker-lina" />);
    await act(async () => {});

    mockFetchWorkerById.mockReturnValue(workerResult.promise);
    rerender(<ServiceRequestForm workerId="worker-b" />);
    expect(screen.queryByText("Lina Morales")).not.toBeInTheDocument();

    await act(async () => {
      workerResult.resolve({
        ...workersForTest.workerB,
      });
    });

    expect(await screen.findByText("Trabajador B")).toBeInTheDocument();
  });

  it("uploads selected files, includes photo URLs, and creates the client notification", async () => {
    mockUploadImage
      .mockResolvedValueOnce("https://images.example/photo-1.jpg")
      .mockResolvedValueOnce("https://images.example/photo-2.jpg");
    render(<ServiceRequestForm />);
    fillValidForm();

    const files = [
      new File(["first"], "first.jpg", { type: "image/jpeg" }),
      new File(["second"], "second.png", { type: "image/png" }),
    ];
    fireEvent.change(screen.getByLabelText(/Adjuntar fotos/), {
      target: { files },
    });

    expect(screen.getByText("first.jpg")).toBeInTheDocument();
    expect(screen.getByText("second.png")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Solicitud publicada en Firebase. Se subieron 2 imágenes.",
    );
    expect(mockUploadImage).toHaveBeenNthCalledWith(1, files[0], "serviceRequests/client-1");
    expect(mockUploadImage).toHaveBeenNthCalledWith(2, files[1], "serviceRequests/client-1");
    expect(batchPayload("serviceRequests")).toEqual(expect.objectContaining({
      photos: [
        "https://images.example/photo-1.jpg",
        "https://images.example/photo-2.jpg",
      ],
    }));
    expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "client-1",
      type: "serviceRequest",
      relatedEntityId: "generated-serviceRequests",
    }));
  });

  it("disables submit while saving and resets values and selected files after success", async () => {
    const requestResult = deferred<void>();
    mockBatchCommit.mockReturnValue(requestResult.promise);
    render(<ServiceRequestForm />);
    fillValidForm();

    const file = new File(["photo"], "pending.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByLabelText(/Adjuntar fotos/) as HTMLInputElement;
    Object.defineProperty(fileInput, "value", {
      configurable: true,
      value: "C:\\fakepath\\pending.jpg",
      writable: true,
    });
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });
    expect(screen.getByText("pending.jpg")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    const pendingSubmit = await screen.findByRole("button", { name: "Publicando..." });
    expect(pendingSubmit).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Reparar fuga");
    expect(screen.getByText("pending.jpg")).toBeInTheDocument();

    await act(async () => {
      requestResult.resolve();
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Solicitud publicada en Firebase. Se subió 1 imagen.",
    );
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Descripción" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Dirección o referencia" })).toHaveValue("");
    expect(screen.queryByText("pending.jpg")).not.toBeInTheDocument();
    expect(fileInput.value).toBe("");
    expect(screen.getByRole("button", { name: "Publicar solicitud" })).toBeDisabled();
  });

  it("resets successful submissions with the current worker and profile defaults", async () => {
    mockFetchWorkerById.mockResolvedValueOnce(workersForTest.workerLina);
    render(<ServiceRequestForm workerId="worker-lina" />);
    await act(async () => {});
    fillValidForm();
    fireEvent.change(screen.getByRole("combobox", { name: "Categoría" }), {
      target: { value: "Plomería" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Municipio" }), {
      target: { value: "Turbo" },
    });

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Solicitud publicada y agenda guardada en Firebase.",
    );
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("Electricidad");
    expect(screen.getByRole("combobox", { name: "Municipio" })).toHaveValue("Apartadó");
  });

  it("rejects unsupported category and municipality values", async () => {
    render(<ServiceRequestForm />);

    const category = screen.getByRole("combobox", { name: "Categoría" });
    const municipality = screen.getByRole("combobox", { name: "Municipio" });
    category.append(new Option("Categoría inventada", "Categoría inventada"));
    municipality.append(new Option("Municipio inventado", "Municipio inventado"));
    fireEvent.change(category, { target: { value: "Categoría inventada" } });
    fireEvent.change(municipality, { target: { value: "Municipio inventado" } });

    expect(await screen.findByText("Selecciona una categoría válida.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona un municipio válido.")).toBeInTheDocument();
  });

  it.each([
    {
      name: "non-image files",
      files: [new File(["text"], "notes.txt", { type: "text/plain" })],
      message: "Solo puedes adjuntar archivos de imagen.",
    },
    {
      name: "more than five files",
      files: Array.from({ length: 6 }, (_, index) => new File(["photo"], `${index}.jpg`, { type: "image/jpeg" })),
      message: "Puedes adjuntar máximo 5 imágenes.",
    },
    {
      name: "files over 5MB",
      files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" })],
      message: "Cada imagen debe pesar máximo 5 MB.",
    },
  ])("rejects $name before upload", async ({ files, message }) => {
    render(<ServiceRequestForm />);
    fillValidForm();

    const fileInput = screen.getByLabelText(/Adjuntar fotos/) as HTMLInputElement;
    Object.defineProperty(fileInput, "value", {
      configurable: true,
      value: `C:\\fakepath\\${files[0].name}`,
      writable: true,
    });
    fireEvent.change(fileInput, {
      target: { files },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(fileInput.value).toBe("");
    expect(mockUploadImage).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("shows a core write failure as an error and does not send notifications", async () => {
    mockBatchCommit.mockRejectedValue(new Error("commit failed"));
    render(<ServiceRequestForm />);
    fillValidForm();

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar en Firestore. Revisa la configuración o intenta más tarde.");
    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("cleans up completed uploads when a later upload fails", async () => {
    mockUploadImage
      .mockResolvedValueOnce("https://images.example/uploaded.jpg")
      .mockRejectedValueOnce(new Error("upload failed"));
    render(<ServiceRequestForm />);
    fillValidForm();

    fireEvent.change(screen.getByLabelText(/Adjuntar fotos/), {
      target: {
        files: [
          new File(["first"], "first.jpg", { type: "image/jpeg" }),
          new File(["second"], "second.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar en Firestore. Revisa la configuración o intenta más tarde.",
    );
    expect(mockStorageRef).toHaveBeenCalledWith({}, "https://images.example/uploaded.jpg");
    expect(mockDeleteObject).toHaveBeenCalledWith({ url: "https://images.example/uploaded.jpg" });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("cleans up all uploaded files when the core batch commit fails without hiding the original error", async () => {
    mockUploadImage
      .mockResolvedValueOnce("https://images.example/one.jpg")
      .mockResolvedValueOnce("https://images.example/two.jpg");
    mockBatchCommit.mockRejectedValue(new Error("commit failed"));
    mockDeleteObject.mockRejectedValue(new Error("cleanup failed"));
    render(<ServiceRequestForm />);
    fillValidForm();

    fireEvent.change(screen.getByLabelText(/Adjuntar fotos/), {
      target: {
        files: [
          new File(["first"], "first.jpg", { type: "image/jpeg" }),
          new File(["second"], "second.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar en Firestore. Revisa la configuración o intenta más tarde.",
    );
    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    expect(mockStorageRef).toHaveBeenCalledWith({}, "https://images.example/one.jpg");
    expect(mockStorageRef).toHaveBeenCalledWith({}, "https://images.example/two.jpg");
  });

  it("keeps core success when notification delivery fails and shows a warning status", async () => {
    mockCreateNotification.mockRejectedValue(new Error("notification failed"));
    render(<ServiceRequestForm />);
    fillValidForm();

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Solicitud publicada en Firebase.");
    expect(status).toHaveTextContent("No pudimos enviar todas las notificaciones.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("writes a service request without creating a booking when no worker is selected", async () => {
    render(<ServiceRequestForm />);
    fillValidForm();

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent("Solicitud publicada en Firebase.");
    expect(collectionPaths()).toContain("serviceRequests");
    expect(collectionPaths()).not.toContain("bookings");
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("preserves automatic booking and job history when a worker is selected", async () => {
    mockFetchWorkerById.mockResolvedValueOnce(workersForTest.workerLina);
    render(<ServiceRequestForm workerId="worker-lina" />);
    await act(async () => {});
    fillValidForm();

    const submit = screen.getByRole("button", { name: "Publicar solicitud" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Solicitud publicada y agenda guardada en Firebase.",
    );
    expect(collectionPaths()).toEqual(expect.arrayContaining(["serviceRequests", "bookings"]));
    expect(mockBatchSet).toHaveBeenCalledTimes(4);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
