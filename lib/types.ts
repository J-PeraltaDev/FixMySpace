export type UserRole = "cliente" | "trabajador" | "admin";

export type UserProfile = {
  uid: string;
  role: UserRole;
  fullName: string;
  phone: string;
  email: string;
  municipality: string;
  avatarUrl?: string;
  createdAt?: unknown;
};

export type PublicProfile = Pick<UserProfile, "uid" | "role" | "fullName" | "municipality" | "avatarUrl">;

export type WorkerProfile = {
  uid: string;
  fullName: string;
  municipality: string;
  avatarUrl: string;
  specialties: string[];
  coverageAreas: string[];
  bio: string;
  experienceYears: number;
  hourlyRate: number;
  verified: boolean;
  published?: boolean;
  ratingAvg: number;
  completedJobs: number;
  distanceKm: number;
  responseTime: string;
};

export type WorkerVerification = {
  status: "pending" | "verified" | "rejected";
  notes?: string;
  reviewedAt?: unknown;
  reviewedBy?: string;
};

export type AdminWorkerProfile = WorkerProfile & {
  verificationStatus: WorkerVerification["status"];
};

export type ServiceRequest = {
  id: string;
  clientId: string;
  workerId?: string;
  title: string;
  description: string;
  category: string;
  municipality: string;
  address: string;
  preferredDate: string;
  preferredTime: string;
  price?: number;
  photos: string[];
  status: "pending" | "negotiating" | "accepted" | "scheduled" | "completed" | "cancelled" | "rejected";
  proposedPrice?: number;
  proposedDate?: string;
  proposedTime?: string;
  lastProposalBy?: string;
  createdAt?: unknown;
};

export type Booking = {
  id: string;
  requestId: string;
  clientId: string;
  workerId: string;
  scheduledAt: string;
  status: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Conversation = {
  id: string;
  participantIds: string[];
  lastMessage: string;
  updatedAt?: unknown;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments: string[];
  createdAt: unknown;
  read?: boolean;
};

export type Review = {
  id: string;
  bookingId: string;
  clientId: string;
  workerId: string;
  rating: number;
  comment: string;
  createdAt: unknown;
};

export type JobEvidence = {
  id: string;
  bookingId: string;
  workerId: string;
  phase: "before" | "during" | "after";
  imageUrl?: string;
  description?: string;
  createdAt?: unknown;
};

export type JobHistory = {
  id: string;
  bookingId: string;
  userId: string;
  service?: string;
  status?: string;
  workerId?: string;
  clientId?: string;
  events: string[];
  evidenceIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actorId?: string;
  createdAt?: unknown;
};

export type SupportReport = {
  id: string;
  userId: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "attended";
  createdAt?: unknown;
  updatedAt?: unknown;
};
