/** @jest-environment node */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const describeWithEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
let environment: RulesTestEnvironment;

const workerProfile = {
  uid: "worker-1",
  role: "trabajador",
  fullName: "Trabajador Publicado",
  municipality: "Apartadó",
  avatarUrl: "",
  specialties: ["Plomería"],
  coverageAreas: ["Apartadó"],
  bio: "",
  experienceYears: 2,
  hourlyRate: 40000,
  verified: true,
  published: true,
  ratingAvg: 5,
  completedJobs: 1,
  distanceKm: 0,
  responseTime: "Responde pronto",
};

describeWithEmulator("Firestore rules reales", () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: "demo-fixmyspace",
      firestore: {
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      },
    });
  });

  beforeEach(async () => environment.clearFirestore());
  afterAll(async () => environment.cleanup());

  async function seed(path: string, id: string, data: Record<string, unknown>) {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), path, id), data);
    });
  }

  it("permite consultar solo perfiles publicados y rechaza auditoría pública", async () => {
    await seed("workerProfiles", "worker-1", workerProfile);
    await seed("workerProfiles", "worker-2", { ...workerProfile, uid: "worker-2", published: false });
    const anonymous = environment.unauthenticatedContext().firestore();

    await assertSucceeds(getDocs(query(collection(anonymous, "workerProfiles"), where("published", "==", true))));
    await assertFails(getDocs(collection(anonymous, "workerProfiles")));
  });

  it("permite al admin consultar perfiles publicados y no publicados", async () => {
    await seed("roles", "admin-1", { role: "admin" });
    await seed("workerProfiles", "worker-1", workerProfile);
    await seed("workerProfiles", "worker-2", { ...workerProfile, uid: "worker-2", published: false });
    const admin = environment.authenticatedContext("admin-1").firestore();

    await assertSucceeds(getDocs(collection(admin, "workerProfiles")));
  });

  it("impide incluso al admin escribir auditoría privada en workerProfiles", async () => {
    await seed("roles", "admin-1", { role: "admin" });
    await seed("workerProfiles", "worker-1", workerProfile);
    const admin = environment.authenticatedContext("admin-1").firestore();

    await assertFails(updateDoc(doc(admin, "workerProfiles", "worker-1"), { verificationNotes: "privado" }));
  });

  it("permite registrar atómicamente un trabajador con defaults completos", async () => {
    const worker = environment.authenticatedContext("worker-1").firestore();
    const batch = writeBatch(worker);
    batch.set(doc(worker, "users", "worker-1"), {
      uid: "worker-1",
      role: "trabajador",
      fullName: "Trabajador Publicado",
      phone: "3000000000",
      email: "worker@example.com",
      municipality: "Apartadó",
      avatarUrl: "",
    });
    batch.set(doc(worker, "publicProfiles", "worker-1"), {
      uid: "worker-1",
      role: "trabajador",
      fullName: "Trabajador Publicado",
      municipality: "Apartadó",
      avatarUrl: "",
    });
    batch.set(doc(worker, "workerProfiles", "worker-1"), { ...workerProfile, verified: false, published: false, ratingAvg: 0, completedJobs: 0 });

    await assertSucceeds(batch.commit());
  });

  it("permite al cliente crear historial de ambos participantes ligado al booking del mismo batch", async () => {
    const client = environment.authenticatedContext("client-1").firestore();
    const batch = writeBatch(client);
    batch.set(doc(client, "serviceRequests", "request-1"), {
      clientId: "client-1",
      workerId: "worker-1",
      status: "pending",
    });
    batch.set(doc(client, "bookings", "booking-1"), {
      requestId: "request-1",
      clientId: "client-1",
      workerId: "worker-1",
      status: "scheduled",
    });
    for (const userId of ["client-1", "worker-1"]) {
      batch.set(doc(client, "jobHistory", `booking-1_${userId}`), {
        bookingId: "booking-1",
        userId,
        clientId: "client-1",
        workerId: "worker-1",
        events: ["Creado"],
      });
    }

    await assertSucceeds(batch.commit());
  });

  it("liga bookings a solicitudes legítimas y bloquea estados o trabajadores fabricados", async () => {
    await seed("serviceRequests", "request-1", {
      clientId: "client-1",
      workerId: "worker-1",
      status: "pending",
    });
    const client = environment.authenticatedContext("client-1").firestore();

    await assertSucceeds(setDoc(doc(client, "bookings", "booking-1"), {
      requestId: "request-1",
      clientId: "client-1",
      workerId: "worker-1",
      status: "scheduled",
      scheduledAt: "2026-06-15 09:30",
      notes: "Trabajo legítimo",
    }));
    await assertFails(setDoc(doc(client, "bookings", "booking-completed"), {
      requestId: "request-1",
      clientId: "client-1",
      workerId: "worker-1",
      status: "completed",
    }));
    await assertFails(setDoc(doc(client, "bookings", "booking-attacker"), {
      requestId: "request-1",
      clientId: "client-1",
      workerId: "attacker",
      status: "scheduled",
    }));
    await assertFails(updateDoc(doc(client, "bookings", "booking-1"), {
      workerId: "attacker",
    }));
    await assertSucceeds(updateDoc(doc(client, "bookings", "booking-1"), {
      status: "cancelled",
    }));
    await assertFails(updateDoc(doc(client, "bookings", "booking-1"), {
      status: "scheduled",
    }));
  });

  it("congela la relación de solicitudes y exige estado inicial pendiente", async () => {
    await seed("serviceRequests", "request-1", {
      clientId: "client-1",
      workerId: "worker-1",
      status: "pending",
    });
    const client = environment.authenticatedContext("client-1").firestore();
    const worker = environment.authenticatedContext("worker-1").firestore();

    await assertFails(setDoc(doc(client, "serviceRequests", "request-completed"), {
      clientId: "client-1",
      workerId: "worker-1",
      status: "completed",
    }));
    await assertFails(updateDoc(doc(worker, "serviceRequests", "request-1"), {
      workerId: "attacker",
    }));
  });

  it("autoriza evidencias por booking a cliente, trabajador y admin, pero no a terceros", async () => {
    await seed("roles", "admin-1", { role: "admin" });
    await seed("bookings", "booking-1", {
      requestId: "request-1",
      clientId: "client-1",
      workerId: "worker-1",
      status: "scheduled",
    });
    await seed("jobEvidences", "evidence-1", {
      bookingId: "booking-1",
      workerId: "worker-1",
      phase: "before",
      imageUrl: "",
      description: "Estado inicial",
    });
    for (const uid of ["client-1", "worker-1", "admin-1"]) {
      const firestore = environment.authenticatedContext(uid).firestore();
      await assertSucceeds(getDocs(query(collection(firestore, "jobEvidences"), where("bookingId", "==", "booking-1"))));
    }
    const attacker = environment.authenticatedContext("attacker").firestore();
    await assertFails(getDocs(query(collection(attacker, "jobEvidences"), where("bookingId", "==", "booking-1"))));
  });

  it("valida forma, rango y unicidad de reseñas de bookings completados", async () => {
    await seed("bookings", "booking-1", { clientId: "client-1", workerId: "worker-1", status: "completed" });
    await seed("bookings", "booking-open", { clientId: "client-1", workerId: "worker-1", status: "scheduled" });
    const client = environment.authenticatedContext("client-1").firestore();
    const validReview = {
      bookingId: "booking-1",
      clientId: "client-1",
      workerId: "worker-1",
      rating: 5,
      comment: "Servicio puntual y trabajo bien realizado.",
    };

    await assertFails(setDoc(doc(client, "reviews", "booking-1"), { ...validReview, rating: 6 }));
    await assertFails(setDoc(doc(client, "reviews", "booking-1"), { ...validReview, rating: "5" }));
    await assertFails(setDoc(doc(client, "reviews", "booking-open"), { ...validReview, bookingId: "booking-open" }));
    await assertFails(setDoc(doc(client, "reviews", "booking-1"), { ...validReview, comment: "x".repeat(1001) }));
    await assertSucceeds(setDoc(doc(client, "reviews", "booking-1"), validReview));
    await assertFails(setDoc(doc(client, "reviews", "booking-1"), { ...validReview, rating: 1 }));
  });

  it("bloquea notificaciones fabricadas aunque referencien booking o solicitud ajenos", async () => {
    await seed("bookings", "booking-1", { clientId: "client-1", workerId: "worker-1", status: "scheduled" });
    await seed("serviceRequests", "request-1", { clientId: "client-1", workerId: "worker-1", status: "pending" });
    const attacker = environment.authenticatedContext("attacker").firestore();
    const base = {
      userId: "worker-1",
      actorId: "attacker",
      read: false,
      type: "fake",
      title: "Ataque",
      message: "Sin relación",
    };

    await assertFails(setDoc(doc(attacker, "notifications", "booking-attack"), {
      ...base,
      relatedEntityId: "booking-1",
      relatedEntityType: "booking",
    }));
    await assertFails(setDoc(doc(attacker, "notifications", "request-attack"), {
      ...base,
      relatedEntityId: "request-1",
      relatedEntityType: "serviceRequest",
    }));
  });

  it("congela destinatario, participantes y reseñas por booking", async () => {
    await seed("notifications", "notification-1", { userId: "client-1", actorId: "worker-1", read: false });
    await seed("conversations", "conversation-1", { participantIds: ["client-1", "worker-1"], lastMessage: "" });
    await seed("bookings", "booking-1", { clientId: "client-1", workerId: "worker-1", status: "completed" });
    const client = environment.authenticatedContext("client-1").firestore();

    await assertFails(setDoc(doc(client, "notifications", "notification-attack"), {
      userId: "worker-1",
      actorId: "client-1",
      read: false,
      type: "fake",
      title: "Ataque",
      message: "Sin relación",
      relatedEntityId: "missing",
      relatedEntityType: "booking",
    }));
    await assertFails(updateDoc(doc(client, "notifications", "notification-1"), { userId: "attacker" }));
    await assertFails(updateDoc(doc(client, "conversations", "conversation-1"), { participantIds: ["client-1", "attacker"] }));
    await assertSucceeds(setDoc(doc(client, "reviews", "booking-1"), {
      bookingId: "booking-1",
      clientId: "client-1",
      workerId: "worker-1",
      rating: 5,
      comment: "Buen servicio",
    }));
    await assertFails(updateDoc(doc(client, "reviews", "booking-1"), { rating: 1 }));
  });

  it("permite conversación y notificación legítimas sin mutar la relación", async () => {
    await seed("publicProfiles", "client-1", { uid: "client-1", role: "cliente", fullName: "Cliente", municipality: "Apartadó", avatarUrl: "" });
    await seed("publicProfiles", "worker-1", { uid: "worker-1", role: "trabajador", fullName: "Trabajador", municipality: "Apartadó", avatarUrl: "" });
    const client = environment.authenticatedContext("client-1").firestore();
    await assertSucceeds(setDoc(doc(client, "conversations", "client-1_worker-1"), {
      participantIds: ["client-1", "worker-1"],
      lastMessage: "",
    }));
    await assertSucceeds(setDoc(doc(client, "conversations", "client-1_worker-1"), {
      participantIds: ["client-1", "worker-1"],
    }, { merge: true }));
    await assertSucceeds(setDoc(doc(client, "notifications", "notification-1"), {
      userId: "worker-1",
      actorId: "client-1",
      read: false,
      type: "message",
      title: "Nuevo mensaje",
      message: "Hola",
      relatedEntityId: "client-1_worker-1",
      relatedEntityType: "conversation",
    }));
  });
});
