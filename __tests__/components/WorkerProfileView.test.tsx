import { render, screen } from "@testing-library/react";
import { WorkerProfileView } from "../../components/WorkerProfileView";
import { fetchReviewsByWorker, fetchWorkerById } from "../../lib/firebase-data";

jest.mock("../../lib/firebase-data", () => ({
  fetchReviewsByWorker: jest.fn(),
  fetchWorkerById: jest.fn(),
  timestampToText: jest.fn(() => "fecha"),
}));

jest.mock("../../components/RatingForm", () => ({
  RatingForm: () => <div>Formulario libre de reseña</div>,
}));

describe("WorkerProfileView", () => {
  it("does not render a free review form without a completed booking", async () => {
    jest.mocked(fetchWorkerById).mockResolvedValue({
      uid: "worker-1",
      fullName: "Trabajador Real",
      municipality: "Apartadó",
      avatarUrl: "",
      specialties: ["Plomería"],
      coverageAreas: ["Apartadó"],
      bio: "Perfil profesional.",
      experienceYears: 5,
      hourlyRate: 40000,
      verified: true,
      published: true,
      ratingAvg: 5,
      completedJobs: 2,
      distanceKm: 1,
      responseTime: "Responde pronto",
    });
    jest.mocked(fetchReviewsByWorker).mockResolvedValue([]);

    render(<WorkerProfileView workerId="worker-1" />);

    expect(await screen.findByRole("heading", { name: "Trabajador Real" })).toBeInTheDocument();
    expect(screen.queryByText("Formulario libre de reseña")).not.toBeInTheDocument();
  });
});
