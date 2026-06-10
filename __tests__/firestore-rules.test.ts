import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rules = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");
const workerProfilesRules = rules.slice(
  rules.indexOf("match /workerProfiles/{uid}"),
  rules.indexOf("match /workerVerifications/{uid}"),
);

describe("reglas de workerProfiles públicos", () => {
  it("aplica la forma pública permitida a create y update incluso para administradores", () => {
    expect(workerProfilesRules).toContain("allow create: if hasPublicWorkerProfileShape(request.resource.data)");
    expect(workerProfilesRules).toContain("allow update: if hasPublicWorkerProfileShape(request.resource.data)");
    expect(workerProfilesRules).not.toMatch(/allow update:\s*if isAdmin\(\)\s*\|\|/);
  });

  it("excluye metadatos privados de auditoría de la forma pública permitida", () => {
    const publicShape = rules.slice(
      rules.indexOf("function hasPublicWorkerProfileShape"),
      rules.indexOf("function isParticipant"),
    );

    expect(publicShape).toContain("keys().hasOnly");
    expect(publicShape).not.toMatch(/verificationNotes|verifiedAt|verifiedBy|verificationStatus|reviewedAt|reviewedBy|notes/);
  });

  it("no permite que un comodín administrativo omita las restricciones específicas", () => {
    expect(rules).not.toMatch(/match \/\{document=\*\*\}[\s\S]*allow read, write: if isAdmin\(\)/);
  });

  it("mantiene el bloque workerProfiles sin cierres o bypasses residuales", () => {
    expect(workerProfilesRules).not.toContain("allow update: if isAdmin()");
    expect(workerProfilesRules).not.toMatch(/\);\s*\);/);
    expect(workerProfilesRules.match(/hasPublicWorkerProfileShape\(request\.resource\.data\)/g)).toHaveLength(2);
  });

  it("mantiene balanceados los delimitadores estructurales de las reglas", () => {
    const withoutStrings = rules.replace(/"[^"]*"/g, "");

    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]] as const) {
      let balance = 0;
      for (const character of withoutStrings) {
        if (character === open) balance += 1;
        if (character === close) balance -= 1;
        expect(balance).toBeGreaterThanOrEqual(0);
      }
      expect(balance).toBe(0);
    }
  });

  it("autoriza el directorio únicamente mediante published true", () => {
    expect(workerProfilesRules).toContain("resource.data.published == true");
    expect(rules.slice(rules.indexOf("function hasPublicWorkerProfileShape"), rules.indexOf("function isParticipant"))).toContain('"published"');
  });

  it("congela destinatario de notificaciones y limita sus actualizaciones a read", () => {
    expect(rules).toContain('request.resource.data.diff(resource.data).affectedKeys().hasOnly(["read"])');
    expect(rules).toContain("request.resource.data.userId == resource.data.userId");
    expect(rules).not.toContain("allow create: if signedIn();");
  });

  it("congela participantes de conversación y limita actualizaciones de mensajes", () => {
    expect(rules).toContain("request.resource.data.participantIds == resource.data.participantIds");
    expect(rules).toContain('affectedKeys().hasOnly(["lastMessage", "updatedAt"])');
    expect(rules).toContain('affectedKeys().hasOnly(["read"])');
  });

  it("valida historial y reseñas contra bookings relacionados", () => {
    expect(rules).toContain("bookingAfter(request.resource.data.bookingId)");
    expect(rules).toContain("request.resource.data.bookingId == reviewId");
    expect(rules).toContain('data.status == "completed"');
  });

  it("liga bookings a solicitudes y valida evidencias y reseñas", () => {
    expect(rules).toContain("serviceRequestAfter(request.resource.data.requestId)");
    expect(rules).toContain('request.resource.data.status == "scheduled"');
    expect(rules).toContain("request.resource.data.rating >= 1");
    expect(rules).toContain("request.resource.data.rating <= 5");
    expect(rules).toContain("request.resource.data.comment.size()");
    expect(rules).toContain("resource.data.bookingId == request.resource.data.bookingId");
  });
});
