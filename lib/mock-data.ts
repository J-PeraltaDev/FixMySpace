import type { Booking, ConversationMessage, Review, ServiceRequest, WorkerProfile } from "./types";

export const serviceCategories = [
  "Plomería",
  "Electricidad",
  "Pintura",
  "Carpintería",
  "Jardinería",
  "Limpieza",
  "Reparaciones",
];

export const municipalities = [
  "Apartadó",
  "Necoclí",
  "Turbo",
  "Chigorodó",
  "Carepa",
  "Arboletes",
];

export const workers: WorkerProfile[] = [
  {
    uid: "worker-lina",
    fullName: "Lina Morales",
    municipality: "Apartadó",
    avatarUrl: "",
    specialties: ["Electricidad", "Instalaciones", "Iluminación"],
    coverageAreas: ["Apartadó", "Necoclí", "Turbo"],
    bio: "Técnica electricista con enfoque en instalaciones seguras, mantenimiento preventivo y soluciones rápidas para hogares y locales pequeños.",
    experienceYears: 7,
    hourlyRate: 42000,
    verified: true,
    ratingAvg: 4.9,
    completedJobs: 118,
    distanceKm: 3.4,
    responseTime: "Responde en 12 min",
  },
  {
    uid: "worker-carlos",
    fullName: "Carlos Rincón",
    municipality: "Carepa",
    avatarUrl: "",
    specialties: ["Plomería", "Gasodomésticos", "Filtraciones"],
    coverageAreas: ["Carepa", "Apartadó", "Turbo"],
    bio: "Especialista en fugas, cambios de grifería, revisión de calentadores y reparaciones urgentes con diagnóstico claro.",
    experienceYears: 11,
    hourlyRate: 50000,
    verified: true,
    ratingAvg: 4.8,
    completedJobs: 206,
    distanceKm: 6.1,
    responseTime: "Responde en 20 min",
  },
  {
    uid: "worker-mateo",
    fullName: "Mateo Arias",
    municipality: "Arboletes",
    avatarUrl: "",
    specialties: ["Pintura", "Drywall", "Acabados"],
    coverageAreas: ["Arboletes", "Necoclí", "Chigorodó"],
    bio: "Pintor residencial con cuadrilla flexible para habitaciones, fachadas, resanes y acabados limpios.",
    experienceYears: 5,
    hourlyRate: 36000,
    verified: false,
    ratingAvg: 4.6,
    completedJobs: 74,
    distanceKm: 9.8,
    responseTime: "Responde hoy",
  },
  {
    uid: "worker-natalia",
    fullName: "Natalia Suárez",
    municipality: "Necoclí",
    avatarUrl: "",
    specialties: ["Limpieza", "Organización", "Mantenimiento"],
    coverageAreas: ["Necoclí", "Apartadó", "Turbo"],
    bio: "Servicios de limpieza profunda, mudanzas, organización de espacios y mantenimiento recurrente para apartamentos.",
    experienceYears: 6,
    hourlyRate: 32000,
    verified: true,
    ratingAvg: 4.9,
    completedJobs: 153,
    distanceKm: 11.2,
    responseTime: "Responde en 35 min",
  },
];

export const serviceRequests: ServiceRequest[] = [
  {
    id: "req-001",
    clientId: "client-demo",
    title: "Reparar fuga bajo lavaplatos",
    description: "Hay una fuga constante y humedad en el mueble inferior.",
    category: "Plomería",
    municipality: "Apartadó",
    address: "Conjunto Arrayanes",
    preferredDate: "2026-06-08",
    preferredTime: "09:00",
    photos: [],
    status: "scheduled",
  },
  {
    id: "req-002",
    clientId: "client-demo",
    title: "Instalar lámpara de comedor",
    description: "Necesito retirar una lámpara antigua e instalar una nueva.",
    category: "Electricidad",
    municipality: "Necoclí",
    address: "Sector Centro",
    preferredDate: "2026-06-10",
    preferredTime: "15:30",
    photos: [],
    status: "pending",
  },
];

export const bookings: Booking[] = [
  {
    id: "booking-001",
    requestId: "req-001",
    clientId: "client-demo",
    workerId: "worker-carlos",
    scheduledAt: "2026-06-08 09:00",
    status: "scheduled",
    notes: "Llevar repuestos para sifón y cinta teflón.",
  },
  {
    id: "booking-002",
    requestId: "req-003",
    clientId: "client-demo",
    workerId: "worker-lina",
    scheduledAt: "2026-05-24 11:00",
    status: "completed",
    notes: "Cambio de tomacorriente finalizado y probado.",
  },
];

export const messages: ConversationMessage[] = [
  {
    id: "msg-1",
    conversationId: "worker-carlos",
    senderId: "client-demo",
    text: "Hola Carlos, ¿puedes revisar una fuga mañana en la mañana?",
    attachments: [],
    createdAt: "08:42",
  },
  {
    id: "msg-2",
    conversationId: "worker-carlos",
    senderId: "worker-carlos",
    text: "Claro. ¿La fuga viene del sifón o de la llave?",
    attachments: [],
    createdAt: "08:44",
  },
  {
    id: "msg-3",
    conversationId: "worker-carlos",
    senderId: "client-demo",
    text: "Parece venir del sifón. Ya adjunté fotos en la solicitud.",
    attachments: [],
    createdAt: "08:46",
  },
];

export const reviews: Review[] = [
  {
    id: "rev-1",
    bookingId: "booking-002",
    clientId: "client-demo",
    workerId: "worker-lina",
    rating: 5,
    comment: "Muy puntual, explicó el arreglo y dejó todo funcionando.",
    createdAt: "2026-05-24",
  },
  {
    id: "rev-2",
    bookingId: "booking-003",
    clientId: "client-ana",
    workerId: "worker-carlos",
    rating: 5,
    comment: "Solucionó la fuga rápido y con precio claro.",
    createdAt: "2026-05-18",
  },
];

export const notifications = [
  { id: "not-1", title: "Nueva respuesta de Carlos", type: "message", read: false },
  { id: "not-2", title: "Solicitud programada para el lunes", type: "booking", read: true },
];
