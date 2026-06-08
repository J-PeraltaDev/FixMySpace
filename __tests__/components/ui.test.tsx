import { render, screen } from "@testing-library/react";
import { Field } from "@/components/ui/Field";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";

describe("UI primitives", () => {
  it("renders the MetricCard label and value", () => {
    const { container } = render(
      <MetricCard label="Solicitudes activas" value="12" />,
    );

    expect(screen.getByText("Solicitudes activas")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("metric-card");
  });

  it("shows an ellipsis value when MetricCard is loading", () => {
    render(<MetricCard label="Trabajadores" value="34" loading />);

    expect(screen.getByText("Trabajadores")).toBeInTheDocument();
    expect(screen.getByText("...")).toBeInTheDocument();
    expect(screen.queryByText("34")).not.toBeInTheDocument();
  });

  it("renders Field label, children, and hint when there is no error", () => {
    const { container } = render(
      <Field label="Nombre" hint="Usa tu nombre completo.">
        <input />
      </Field>,
    );

    expect(screen.getByText("Nombre")).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Nombre" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription("Usa tu nombre completo.");
    expect(screen.getByText("Usa tu nombre completo.")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("field");
  });

  it("renders Field error instead of hint when both are provided", () => {
    const { container } = render(
      <Field
        label="Nombre"
        hint="Usa tu nombre completo."
        error="El nombre es obligatorio."
      >
        <input />
      </Field>,
    );

    const error = screen.getByText("El nombre es obligatorio.");
    const input = screen.getByRole("textbox", { name: "Nombre" });
    expect(error).toBeInTheDocument();
    expect(error).toHaveAttribute("role", "alert");
    expect(screen.queryByText("Usa tu nombre completo.")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(input).toHaveAccessibleDescription("El nombre es obligatorio.");
    expect(container.firstChild).toHaveClass("field");
  });

  it("preserves child description ids when adding Field hint description", () => {
    render(
      <>
        <p id="external-description">Disponible para propietarios.</p>
        <Field label="Biografia" hint="Describe tu experiencia.">
          <textarea aria-describedby="external-description" />
        </Field>
      </>,
    );

    const textarea = screen.getByRole("textbox", { name: "Biografia" });
    const hint = screen.getByText("Describe tu experiencia.");

    expect(textarea).toHaveAttribute(
      "aria-describedby",
      `external-description ${hint.id}`,
    );
    expect(textarea).toHaveAccessibleDescription(
      "Disponible para propietarios. Describe tu experiencia.",
    );
  });

  it("preserves child aria-invalid when Field has an error", () => {
    render(
      <Field label="Correo" error="El correo es invalido.">
        <input aria-invalid="spelling" />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Correo" });

    expect(input).toHaveAttribute("aria-invalid", "spelling");
    expect(input).toHaveAccessibleDescription("El correo es invalido.");
  });

  it("renders SectionCard title, actions, and children", () => {
    const { container } = render(
      <SectionCard
        actions={<button type="button">Actualizar</button>}
        className="dashboard-section"
        title="Resumen"
      >
        <p>Contenido de la seccion</p>
      </SectionCard>,
    );

    const title = screen.getByRole("heading", { name: "Resumen" });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("section-title");
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();
    expect(screen.getByText("Contenido de la seccion")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("soft-card", "dashboard-section");
  });

  it("renders the requested number of styled LoadingSkeleton items", () => {
    render(<LoadingSkeleton className="dashboard-skeleton" count={3} />);

    const skeletons = screen.getAllByRole("status", { name: "Cargando" });
    expect(skeletons).toHaveLength(3);
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveClass(
        "animate-pulse",
        "bg-white",
        "dashboard-skeleton",
        "soft-card",
      );
    });
  });
});
