const mockInitializeApp = jest.fn((config) => ({ config }));
const mockGetApps = jest.fn(() => []);
const mockGetAuth = jest.fn();
const mockGetFirestore = jest.fn();
const mockGetStorage = jest.fn();

jest.mock("firebase/app", () => ({
  getApps: mockGetApps,
  initializeApp: mockInitializeApp,
}));

jest.mock("firebase/auth", () => ({
  getAuth: mockGetAuth,
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: mockGetFirestore,
}));

jest.mock("firebase/storage", () => ({
  getStorage: mockGetStorage,
}));

const originalEnv = process.env;

describe("firebase configuration", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_FIREBASE_API_KEY: "env-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "env-auth-domain",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "env-project-id",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "env-storage-bucket",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "env-sender-id",
      NEXT_PUBLIC_FIREBASE_APP_ID: "env-app-id",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("initializes Firebase with the API key and project ID from the environment", async () => {
    await import("../firebase");

    expect(mockInitializeApp).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "env-api-key",
        projectId: "env-project-id",
      }),
    );
  });
});
