import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { doc, setDoc } from "firebase/firestore";
import { RatingForm } from "../../components/RatingForm";
import { useAuth } from "../../components/AuthProvider";

jest.mock("../../components/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("@/firebase", () => ({ db: {} }), { virtual: true });
jest.mock("../../firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, path, id) => ({ path, id })),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
  setDoc: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../lib/firebase-data", () => ({ createNotification: jest.fn().mockResolvedValue(undefined) }));

describe("RatingForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      firebaseUser: null,
      profile: {
        uid: "client-1",
        role: "cliente",
        fullName: "Cliente",
        phone: "",
        email: "client@example.com",
        municipality: "Apartadó",
      },
      loading: false,
      error: "",
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateLocalProfile: jest.fn(),
    });
  });

  it("rejects reviews without a booking", async () => {
    render(<RatingForm workerId="worker-1" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Comentario" }), { target: { value: "Buen trabajo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reseña" }));

    expect(await screen.findByText("Solo puedes calificar un servicio completado desde su historial.")).toBeInTheDocument();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("uses bookingId as the unique review document id", async () => {
    render(<RatingForm workerId="worker-1" bookingId="booking-1" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Comentario" }), { target: { value: "Buen trabajo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reseña" }));

    await waitFor(() => expect(setDoc).toHaveBeenCalled());
    expect(doc).toHaveBeenCalledWith({}, "reviews", "booking-1");
  });

  it("rechaza comentarios demasiado cortos antes de escribir", async () => {
    render(<RatingForm workerId="worker-1" bookingId="booking-1" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Comentario" }), { target: { value: "Ok" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reseña" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El comentario debe tener entre 3 y 1000 caracteres.");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("rechaza comentarios que exceden el límite antes de escribir", async () => {
    render(<RatingForm workerId="worker-1" bookingId="booking-1" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Comentario" }), { target: { value: "x".repeat(1001) } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reseña" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El comentario debe tener entre 3 y 1000 caracteres.");
    expect(setDoc).not.toHaveBeenCalled();
  });
});
