# FixMySpace Phase 1 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 foundations for FixMySpace: environment-based Firebase config, shared Firestore hooks, reusable UI primitives, RHF/Zod validation for service requests, and Jest/RTL coverage for critical surfaces.

**Architecture:** Keep the existing Next.js App Router structure. Add `hooks/` for client-side Firestore reads, `components/ui/` for shared UI primitives, `lib/validation/` for Zod schemas, and `__tests__/` plus Jest setup for integration-style component tests with Firebase mocks.

**Tech Stack:** Next.js 16.2.7, React 19.2.4, Firebase Web SDK 12.14.0, Tailwind 4, React Hook Form, Zod, `@hookform/resolvers`, Jest, React Testing Library.

---

## File Structure

- Modify: `firebase.js` - read public Firebase config from `NEXT_PUBLIC_*` variables with current values as development fallback.
- Create: `.env.example` - document required Firebase variables without private secrets.
- Modify: `package.json` - add test scripts and dependencies after installation.
- Create: `jest.config.ts` - Next.js Jest config.
- Create: `jest.setup.ts` - RTL matcher setup and browser API shims.
- Create: `__tests__/test-utils.tsx` - shared render helpers and auth mocks.
- Create: `__tests__/firebase-mock.ts` - deterministic Firestore/Storage/Auth mock data and helpers.
- Create: `hooks/useCollection.ts` - reusable collection hook.
- Create: `components/ui/MetricCard.tsx` - reusable metric card.
- Create: `components/ui/SectionCard.tsx` - reusable section card.
- Create: `components/ui/LoadingSkeleton.tsx` - reusable loading skeleton list.
- Create: `components/ui/Field.tsx` - reusable form field wrapper.
- Create: `lib/validation/service-request.ts` - Zod schema for service request form.
- Modify: `components/SearchDirectory.tsx` - use `useCollection`, `LoadingSkeleton`, and preserve fallback workers.
- Modify: `components/DashboardView.tsx` - use `useCollection` and `MetricCard`.
- Modify: `components/HistoryTimeline.tsx` - use `useCollection` and `LoadingSkeleton`.
- Modify: `components/MessagesInbox.tsx` - use `useCollection` for conversations while preserving partner enrichment.
- Modify: `components/ServiceRequestForm.tsx` - migrate manual validation to React Hook Form and Zod.
- Test: `__tests__/hooks/useCollection.test.tsx`
- Test: `__tests__/components/SearchDirectory.test.tsx`
- Test: `__tests__/components/ServiceRequestForm.test.tsx`
- Test: `__tests__/components/ChatThread.test.tsx`
- Test: `__tests__/components/AdminPanel.test.tsx`

Note: This workspace is not currently a Git repository. Commit steps are intentionally omitted until the project is initialized with Git.

---

### Task 1: Install Dependencies and Configure Jest

**Files:**
- Modify: `package.json`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Install runtime form dependencies**

Run:

```powershell
npm install react-hook-form zod @hookform/resolvers
```

Expected: `package.json` includes `react-hook-form`, `zod`, and `@hookform/resolvers` in `dependencies`.

- [ ] **Step 2: Install test dependencies**

Run:

```powershell
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom ts-node @types/jest
```

Expected: `package.json` includes the packages in `devDependencies`.

- [ ] **Step 3: Add Jest scripts**

Update `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:webpack": "next dev --webpack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "clean": "node -e \"require('fs').rmSync('.next',{recursive:true,force:true})\"",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 4: Create Jest config**

Create `jest.config.ts`:

```ts
import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

export default createJestConfig(config);
```

- [ ] **Step 5: Create Jest setup**

Create `jest.setup.ts`:

```ts
import "@testing-library/jest-dom";

if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

- [ ] **Step 6: Verify Jest starts**

Run:

```powershell
npm test -- --runInBand --passWithNoTests
```

Expected: PASS with no test files found, or Jest exits successfully because `--passWithNoTests` is set.

---

### Task 2: Move Firebase Config to Environment Variables

**Files:**
- Modify: `firebase.js`
- Create: `.env.example`

- [ ] **Step 1: Write failing config test**

Create `__tests__/firebase-config.test.ts`:

```ts
describe("firebase config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("initializes Firebase with NEXT_PUBLIC environment variables", async () => {
    jest.doMock("firebase/app", () => ({
      getApps: jest.fn(() => []),
      initializeApp: jest.fn((config) => ({ name: "mock-app", config })),
    }));
    jest.doMock("firebase/auth", () => ({ getAuth: jest.fn(() => "auth") }));
    jest.doMock("firebase/firestore", () => ({ getFirestore: jest.fn(() => "db") }));
    jest.doMock("firebase/storage", () => ({ getStorage: jest.fn(() => "storage") }));

    const firebaseApp = await import("../firebase");

    expect(firebaseApp.app.config.apiKey).toBe("test-api-key");
    expect(firebaseApp.app.config.projectId).toBe("test-project");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- __tests__/firebase-config.test.ts --runInBand
```

Expected: FAIL because `firebase.js` still uses hardcoded values.

- [ ] **Step 3: Update Firebase config**

Replace the config object in `firebase.js` with:

```js
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCNmxDPPDyTJN4UxrQ28fzvsIG-QR8ZY88",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "fixmyspace-a6a0f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fixmyspace-a6a0f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "fixmyspace-a6a0f.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "215565790436",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:215565790436:web:50cf0380772563ec1d10f1",
};
```

Keep the existing exports:

```js
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

- [ ] **Step 4: Create env example**

Create `.env.example`:

```txt
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

- [ ] **Step 5: Verify test passes**

Run:

```powershell
npm test -- __tests__/firebase-config.test.ts --runInBand
```

Expected: PASS.

---

### Task 3: Add Firestore Test Utilities and `useCollection`

**Files:**
- Create: `__tests__/firebase-mock.ts`
- Create: `hooks/useCollection.ts`
- Test: `__tests__/hooks/useCollection.test.tsx`

- [ ] **Step 1: Create Firestore mock helper**

Create `__tests__/firebase-mock.ts`:

```ts
type MockDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

export function makeSnapshot(rows: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: rows.map(
      (row): MockDoc => ({
        id: row.id,
        data: () => row.data,
      }),
    ),
  };
}

export const unsubscribe = jest.fn();

export const firestoreMock = {
  collection: jest.fn((_db: unknown, path: string) => ({ type: "collection", path })),
  query: jest.fn((collectionRef: unknown, ...constraints: unknown[]) => ({ type: "query", collectionRef, constraints })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ type: "where", field, op, value })),
  orderBy: jest.fn((field: string, direction?: string) => ({ type: "orderBy", field, direction })),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
};
```

- [ ] **Step 2: Write failing hook test**

Create `__tests__/hooks/useCollection.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { firestoreMock, makeSnapshot, unsubscribe } from "../firebase-mock";

jest.mock("@/firebase", () => ({ db: {} }));

jest.mock("firebase/firestore", () => ({
  collection: firestoreMock.collection,
  query: firestoreMock.query,
  where: firestoreMock.where,
  orderBy: firestoreMock.orderBy,
  getDocs: firestoreMock.getDocs,
  onSnapshot: firestoreMock.onSnapshot,
}));

describe("useCollection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads collection data with id fields using getDocs", async () => {
    firestoreMock.getDocs.mockResolvedValueOnce(
      makeSnapshot([{ id: "worker-1", data: { fullName: "Ana Ruiz" } }]),
    );

    const { useCollection } = await import("../../hooks/useCollection");
    const { result } = renderHook(() =>
      useCollection<{ id: string; fullName: string }>("workerProfiles", [], { realtime: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([{ id: "worker-1", fullName: "Ana Ruiz" }]);
    expect(result.current.error).toBe("");
  });

  it("subscribes with onSnapshot when realtime is enabled", async () => {
    firestoreMock.onSnapshot.mockImplementation((_queryRef, onNext) => {
      onNext(makeSnapshot([{ id: "conv-1", data: { lastMessage: "Hola" } }]));
      return unsubscribe;
    });

    const { useCollection } = await import("../../hooks/useCollection");
    const { result, unmount } = renderHook(() =>
      useCollection<{ id: string; lastMessage: string }>("conversations", [], { realtime: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data[0].lastMessage).toBe("Hola");
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("does not query Firestore when disabled", async () => {
    const { useCollection } = await import("../../hooks/useCollection");
    const { result } = renderHook(() => useCollection("workerProfiles", [], { enabled: false }));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([]);
    expect(firestoreMock.getDocs).not.toHaveBeenCalled();
    expect(firestoreMock.onSnapshot).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
npm test -- __tests__/hooks/useCollection.test.tsx --runInBand
```

Expected: FAIL because `hooks/useCollection.ts` does not exist.

- [ ] **Step 4: Implement hook**

Create `hooks/useCollection.ts`:

```ts
"use client";

import {
  collection,
  getDocs,
  onSnapshot,
  orderBy as orderByConstraint,
  query,
  type QueryConstraint,
  type WhereFilterOp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";

export type CollectionFilter = {
  field: string;
  op: WhereFilterOp;
  value: unknown;
};

export type CollectionOrder = {
  field: string;
  direction?: "asc" | "desc";
};

export type UseCollectionOptions = {
  enabled?: boolean;
  realtime?: boolean;
  orderBy?: CollectionOrder[];
};

export type UseCollectionResult<T> = {
  data: T[];
  loading: boolean;
  error: string;
};

function mapSnapshot<T>(snapshot: { docs: Array<{ id: string; data: () => unknown }> }) {
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as Record<string, unknown>) }) as T);
}

export function useCollection<T>(
  path: string,
  filters: CollectionFilter[] = [],
  options: UseCollectionOptions = {},
): UseCollectionResult<T> {
  const { enabled = true, realtime = true, orderBy = [] } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const orderKey = useMemo(() => JSON.stringify(orderBy), [orderBy]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError("");
      return;
    }

    const parsedFilters = JSON.parse(filterKey) as CollectionFilter[];
    const parsedOrder = JSON.parse(orderKey) as CollectionOrder[];
    const constraints: QueryConstraint[] = [
      ...parsedFilters.map((filter) => where(filter.field, filter.op, filter.value)),
      ...parsedOrder.map((order) => orderByConstraint(order.field, order.direction)),
    ];
    const collectionQuery = constraints.length ? query(collection(db, path), ...constraints) : query(collection(db, path));
    let cancelled = false;

    setLoading(true);
    setError("");

    if (realtime) {
      const unsubscribe = onSnapshot(
        collectionQuery,
        (snapshot) => {
          setData(mapSnapshot<T>(snapshot));
          setLoading(false);
        },
        () => {
          setError("No pudimos leer los datos en Firestore.");
          setLoading(false);
        },
      );

      return unsubscribe;
    }

    getDocs(collectionQuery)
      .then((snapshot) => {
        if (!cancelled) setData(mapSnapshot<T>(snapshot));
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos leer los datos en Firestore.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, filterKey, orderKey, path, realtime]);

  return { data, loading, error };
}
```

- [ ] **Step 5: Verify hook tests pass**

Run:

```powershell
npm test -- __tests__/hooks/useCollection.test.tsx --runInBand
```

Expected: PASS.

---

### Task 4: Add Reusable UI Components

**Files:**
- Create: `components/ui/MetricCard.tsx`
- Create: `components/ui/SectionCard.tsx`
- Create: `components/ui/LoadingSkeleton.tsx`
- Create: `components/ui/Field.tsx`
- Test: `__tests__/components/ui.test.tsx`

- [ ] **Step 1: Write failing UI component test**

Create `__tests__/components/ui.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

describe("shared UI components", () => {
  it("renders a metric value and loading state", async () => {
    const { MetricCard } = await import("../../components/ui/MetricCard");
    const { rerender } = render(<MetricCard label="Servicios activos" value={3} />);

    expect(screen.getByText("Servicios activos")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(<MetricCard label="Servicios activos" value={3} loading />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("renders a field error next to its label", async () => {
    const { Field } = await import("../../components/ui/Field");

    render(
      <Field label="Descripción" error="La descripción debe tener al menos 20 caracteres">
        <textarea />
      </Field>,
    );

    expect(screen.getByText("Descripción")).toBeInTheDocument();
    expect(screen.getByText("La descripción debe tener al menos 20 caracteres")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- __tests__/components/ui.test.tsx --runInBand
```

Expected: FAIL because UI component files do not exist.

- [ ] **Step 3: Create `MetricCard`**

Create `components/ui/MetricCard.tsx`:

```tsx
type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  loading?: boolean;
};

export function MetricCard({ label, value, loading = false }: MetricCardProps) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{loading ? "..." : value}</strong>
    </div>
  );
}
```

- [ ] **Step 4: Create `SectionCard`**

Create `components/ui/SectionCard.tsx`:

```tsx
type SectionCardProps = {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ title, actions, children, className = "" }: SectionCardProps) {
  return (
    <section className={`soft-card p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="section-title">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 5: Create `LoadingSkeleton`**

Create `components/ui/LoadingSkeleton.tsx`:

```tsx
type LoadingSkeletonProps = {
  count?: number;
  className?: string;
};

export function LoadingSkeleton({ count = 1, className = "h-36" }: LoadingSkeletonProps) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`soft-card animate-pulse bg-white ${className}`} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `Field`**

Create `components/ui/Field.tsx`:

```tsx
type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && !error && <span className="text-xs font-medium text-[#5f5e5a]">{hint}</span>}
      {error && <span className="text-xs font-bold text-[#93000a]">{error}</span>}
    </label>
  );
}
```

- [ ] **Step 7: Verify UI tests pass**

Run:

```powershell
npm test -- __tests__/components/ui.test.tsx --runInBand
```

Expected: PASS.

---

### Task 5: Refactor `SearchDirectory` to Use `useCollection`

**Files:**
- Modify: `components/SearchDirectory.tsx`
- Test: `__tests__/components/SearchDirectory.test.tsx`

- [ ] **Step 1: Write failing directory test**

Create `__tests__/components/SearchDirectory.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchDirectory } from "../../components/SearchDirectory";
import { firestoreMock, makeSnapshot } from "../firebase-mock";

jest.mock("@/firebase", () => ({ db: {} }));

jest.mock("firebase/firestore", () => ({
  collection: firestoreMock.collection,
  query: firestoreMock.query,
  where: firestoreMock.where,
  orderBy: firestoreMock.orderBy,
  getDocs: firestoreMock.getDocs,
  onSnapshot: firestoreMock.onSnapshot,
}));

describe("SearchDirectory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders workers from Firestore and filters verified workers", async () => {
    firestoreMock.onSnapshot.mockImplementation((_queryRef, onNext) => {
      onNext(
        makeSnapshot([
          {
            id: "worker-1",
            data: {
              fullName: "Ana Ruiz",
              municipality: "Apartadó",
              avatarUrl: "",
              specialties: ["Plomería"],
              coverageAreas: ["Apartadó"],
              bio: "Técnica local",
              experienceYears: 4,
              hourlyRate: 45000,
              verified: true,
              ratingAvg: 4.8,
              completedJobs: 12,
              distanceKm: 2,
              responseTime: "Responde hoy",
            },
          },
          {
            id: "worker-2",
            data: {
              fullName: "Luis Pérez",
              municipality: "Turbo",
              avatarUrl: "",
              specialties: ["Electricidad"],
              coverageAreas: ["Turbo"],
              bio: "Electricista",
              experienceYears: 2,
              hourlyRate: 50000,
              verified: false,
              ratingAvg: 4.1,
              completedJobs: 3,
              distanceKm: 7,
              responseTime: "Responde pronto",
            },
          },
        ]),
      );
      return jest.fn();
    });

    render(<SearchDirectory />);

    await waitFor(() => expect(screen.getByText("Ana Ruiz")).toBeInTheDocument());
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Solo verificados/i));

    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.queryByText("Luis Pérez")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails for current implementation**

Run:

```powershell
npm test -- __tests__/components/SearchDirectory.test.tsx --runInBand
```

Expected: FAIL because current component uses `fetchWorkers`, not mocked `useCollection`/Firestore snapshot path.

- [ ] **Step 3: Refactor imports and data loading**

In `components/SearchDirectory.tsx`, replace:

```ts
import { useEffect, useMemo, useState } from "react";
import { fetchWorkers } from "@/lib/firebase-data";
```

with:

```ts
import { useMemo, useState } from "react";
import { useCollection } from "@/hooks/useCollection";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";
```

Replace local `workers`, `loading`, and `error` state plus the `useEffect` with:

```ts
const {
  data: firestoreWorkers,
  loading,
  error,
} = useCollection<WorkerProfile>("workerProfiles", [], { realtime: true });

const workers = firestoreWorkers.length ? firestoreWorkers : fallbackWorkers;
const dataSourceLabel = error ? "Fallback visual" : firestoreWorkers.length ? "Firestore" : "Ejemplos";
```

Keep filter state unchanged.

- [ ] **Step 4: Replace loading skeleton markup**

Replace the inline loading block with:

```tsx
<div className="grid gap-4 xl:grid-cols-2">
  <LoadingSkeleton count={2} className="h-56" />
</div>
```

If this nests grids poorly, use:

```tsx
<div className="grid gap-4 xl:grid-cols-2">
  {[0, 1].map((item) => (
    <LoadingSkeleton key={item} count={1} className="h-56" />
  ))}
</div>
```

Update the source label span to:

```tsx
{dataSourceLabel}
```

- [ ] **Step 5: Verify SearchDirectory test passes**

Run:

```powershell
npm test -- __tests__/components/SearchDirectory.test.tsx --runInBand
```

Expected: PASS.

---

### Task 6: Refactor Dashboard, History, and Messages to Use `useCollection`

**Files:**
- Modify: `components/DashboardView.tsx`
- Modify: `components/HistoryTimeline.tsx`
- Modify: `components/MessagesInbox.tsx`
- Test: `__tests__/components/ChatThread.test.tsx`
- Test: `__tests__/components/AdminPanel.test.tsx`

- [ ] **Step 1: Write existing ChatThread smoke test**

Create `__tests__/components/ChatThread.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatThread } from "../../components/ChatThread";
import { firestoreMock, makeSnapshot } from "../firebase-mock";

jest.mock("@/firebase", () => ({ db: {} }));

jest.mock("../../components/AuthProvider", () => ({
  useAuth: () => ({
    profile: {
      uid: "client-1",
      fullName: "Cliente Uno",
      role: "cliente",
      email: "cliente@test.com",
      phone: "300",
      municipality: "Apartadó",
    },
  }),
}));

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(async () => ({ id: "message-2" })),
  collection: firestoreMock.collection,
  doc: jest.fn((_db, path, id) => ({ path, id })),
  getDoc: jest.fn(async () => ({ exists: () => false, data: () => ({}) })),
  onSnapshot: firestoreMock.onSnapshot,
  query: firestoreMock.query,
  serverTimestamp: jest.fn(() => new Date("2026-06-06T12:00:00Z")),
  setDoc: jest.fn(async () => undefined),
  where: firestoreMock.where,
}));

describe("ChatThread", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders realtime messages and allows typing a draft", async () => {
    firestoreMock.onSnapshot.mockImplementation((_queryRef, onNext) => {
      onNext(makeSnapshot([{ id: "message-1", data: { conversationId: "client-1_worker-1", senderId: "worker-1", text: "Hola", attachments: [], createdAt: new Date() } }]));
      return jest.fn();
    });

    render(<ChatThread conversationId="worker-1" />);

    await waitFor(() => expect(screen.getByText("Hola")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Escribe un mensaje"), { target: { value: "Gracias" } });
    expect(screen.getByDisplayValue("Gracias")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write AdminPanel smoke test**

Create `__tests__/components/AdminPanel.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { AdminPanel } from "../../components/AdminPanel";

jest.mock("@/firebase", () => ({ db: {} }));

jest.mock("../../components/AuthProvider", () => ({
  useAuth: () => ({
    profile: {
      uid: "admin-1",
      fullName: "Admin",
      role: "admin",
      email: "admin@test.com",
      phone: "300",
      municipality: "Apartadó",
    },
  }),
}));

jest.mock("@/lib/firebase-data", () => ({
  createNotification: jest.fn(),
  fetchAdminCollections: jest.fn(async () => ({
    users: [{ uid: "u1", fullName: "Usuario", role: "cliente", email: "u@test.com", phone: "1", municipality: "Apartadó" }],
    workers: [],
    serviceRequests: [],
    bookings: [],
    reviews: [],
    reports: [],
    notifications: [],
  })),
  serviceRequestStatuses: ["pending", "accepted", "scheduled", "completed", "cancelled"],
  timestampToText: jest.fn(() => "Fecha registrada"),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
  updateDoc: jest.fn(),
}));

describe("AdminPanel", () => {
  it("renders administrative metrics", async () => {
    render(<AdminPanel />);

    await waitFor(() => expect(screen.getByText("Usuarios")).toBeInTheDocument());
    expect(screen.getByText("Trabajadores")).toBeInTheDocument();
    expect(screen.getByText("Solicitudes")).toBeInTheDocument();
    expect(screen.getByText("Reportes abiertos")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run smoke tests to verify current surfaces are covered**

Run:

```powershell
npm test -- __tests__/components/ChatThread.test.tsx __tests__/components/AdminPanel.test.tsx --runInBand
```

Expected: PASS after minor mock adjustments if needed. These tests protect existing chat/admin behavior while Phase 1 refactors data elsewhere.

- [ ] **Step 4: Refactor DashboardView data reads**

In `components/DashboardView.tsx`, remove:

```ts
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { fetchUserBookings, fetchUserRequests } from "@/lib/firebase-data";
```

Use:

```ts
import { useMemo } from "react";
import { useCollection } from "@/hooks/useCollection";
import type { CollectionFilter } from "@/hooks/useCollection";
import { MetricCard } from "./ui/MetricCard";
```

Build filters:

```ts
const role = profile?.role || "cliente";
const bookingField = role === "trabajador" ? "workerId" : "clientId";
const enabled = Boolean(profile);
const userFilter: CollectionFilter[] = profile ? [{ field: bookingField, op: "==", value: profile.uid }] : [];
const notificationFilter: CollectionFilter[] = profile ? [{ field: "userId", op: "==", value: profile.uid }] : [];

const bookingsState = useCollection<Booking>("bookings", userFilter, { enabled, realtime: true });
const requestsState = useCollection<ServiceRequest>("serviceRequests", userFilter, { enabled, realtime: true });
const notificationsState = useCollection<Notification>("notifications", notificationFilter, { enabled, realtime: true });

const bookings = bookingsState.data;
const requests = requestsState.data;
const notifications = notificationsState.data;
const loading = bookingsState.loading || requestsState.loading;
const error = bookingsState.error || requestsState.error || notificationsState.error;
```

Replace metric cards:

```tsx
<MetricCard label="Servicios activos" value={activeServices} loading={loading} />
<MetricCard label="Notificaciones nuevas" value={unread} />
<MetricCard label="Solicitudes" value={requests.length} loading={loading} />
```

- [ ] **Step 5: Refactor HistoryTimeline data reads**

In `components/HistoryTimeline.tsx`, remove `useEffect`, `useState`, `fetchUserBookings`, and `fetchUserHistory`.

Use:

```ts
import { useCollection } from "@/hooks/useCollection";
import type { CollectionFilter } from "@/hooks/useCollection";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";
```

Add:

```ts
const enabled = Boolean(profile);
const bookingField = profile?.role === "trabajador" ? "workerId" : "clientId";
const historyFilters: CollectionFilter[] = profile ? [{ field: "userId", op: "==", value: profile.uid }] : [];
const bookingFilters: CollectionFilter[] = profile ? [{ field: bookingField, op: "==", value: profile.uid }] : [];

const historyState = useCollection<JobHistory>("jobHistory", historyFilters, { enabled, realtime: true });
const bookingsState = useCollection<Booking>("bookings", bookingFilters, { enabled, realtime: true });

const history = historyState.data;
const bookings = bookingsState.data;
const loading = historyState.loading || bookingsState.loading;
const error = historyState.error || bookingsState.error;
```

Replace loading markup:

```tsx
<LoadingSkeleton count={2} className="h-44" />
```

- [ ] **Step 6: Refactor MessagesInbox conversation read**

In `components/MessagesInbox.tsx`, remove direct `collection`, `onSnapshot`, `query`, `where` imports. Keep `doc` and `getDoc`.

Use:

```ts
import { useCollection } from "@/hooks/useCollection";
import type { CollectionFilter } from "@/hooks/useCollection";
```

Add base read:

```ts
const conversationFilters: CollectionFilter[] = profile
  ? [{ field: "participantIds", op: "array-contains", value: profile.uid }]
  : [];
const conversationsState = useCollection<Conversation>("conversations", conversationFilters, {
  enabled: Boolean(profile),
  realtime: true,
});
```

Keep local preview state for enriched partner details:

```ts
const [conversations, setConversations] = useState<ConversationPreview[]>([]);
const [previewError, setPreviewError] = useState("");
```

Replace the old Firestore subscription effect with an enrichment effect:

```ts
useEffect(() => {
  let cancelled = false;

  async function enrichConversations() {
    if (!profile || conversationsState.loading) return;
    setPreviewError("");

    try {
      const previews = await Promise.all(
        conversationsState.data.map(async (conversation) => {
          const partnerId = conversation.participantIds.find((id) => id !== profile.uid) || "";
          let partnerName = "Conversación";
          let partnerRole = "usuario";

          if (partnerId) {
            const partnerSnapshot = await getDoc(doc(db, "users", partnerId));
            if (partnerSnapshot.exists()) {
              const partner = partnerSnapshot.data();
              partnerName = typeof partner.fullName === "string" ? partner.fullName : partnerName;
              partnerRole = typeof partner.role === "string" ? partner.role : partnerRole;
            }
          }

          return { ...conversation, partnerId, partnerName, partnerRole };
        }),
      );

      if (!cancelled) setConversations(previews.sort((a, b) => updatedAtMillis(b) - updatedAtMillis(a)));
    } catch {
      if (!cancelled) setPreviewError("No pudimos preparar la lista de mensajes.");
    }
  }

  enrichConversations();
  return () => {
    cancelled = true;
  };
}, [conversationsState.data, conversationsState.loading, profile]);
```

Use:

```ts
const loading = conversationsState.loading;
const error = conversationsState.error || previewError;
```

- [ ] **Step 7: Verify lint and protected tests**

Run:

```powershell
npm run lint
npm test -- __tests__/components/ChatThread.test.tsx __tests__/components/AdminPanel.test.tsx --runInBand
```

Expected: lint passes and both tests pass.

---

### Task 7: Migrate `ServiceRequestForm` to React Hook Form and Zod

**Files:**
- Create: `lib/validation/service-request.ts`
- Modify: `components/ServiceRequestForm.tsx`
- Test: `__tests__/components/ServiceRequestForm.test.tsx`

- [ ] **Step 1: Write failing validation test**

Create `__tests__/components/ServiceRequestForm.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ServiceRequestForm } from "../../components/ServiceRequestForm";

const addDoc = jest.fn(async () => ({ id: "request-1" }));

jest.mock("@/firebase", () => ({ db: {}, storage: {} }));

jest.mock("../../components/AuthProvider", () => ({
  useAuth: () => ({
    profile: {
      uid: "client-1",
      fullName: "Cliente Uno",
      role: "cliente",
      email: "cliente@test.com",
      phone: "300",
      municipality: "Apartadó",
    },
  }),
}));

jest.mock("@/lib/firebase-data", () => ({
  createNotification: jest.fn(async () => undefined),
  fetchWorkerById: jest.fn(async () => null),
  uploadImage: jest.fn(async () => "https://example.com/image.jpg"),
}));

jest.mock("firebase/firestore", () => ({
  addDoc,
  collection: jest.fn((_db, path) => ({ path })),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date("2026-06-06T12:00:00Z")),
  setDoc: jest.fn(async () => undefined),
}));

describe("ServiceRequestForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows field errors and disables submit until the form is valid", async () => {
    render(<ServiceRequestForm />);

    const submit = screen.getByRole("button", { name: /Publicar solicitud/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Fuga" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Muy corto" } });
    fireEvent.blur(screen.getByLabelText("Descripción"));

    expect(await screen.findByText("La descripción debe tener al menos 20 caracteres.")).toBeInTheDocument();
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Hay una fuga bajo el lavaplatos desde hace dos días." },
    });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Plomería" } });
    fireEvent.change(screen.getByLabelText("Municipio"), { target: { value: "Apartadó" } });
    fireEvent.change(screen.getByLabelText("Dirección o referencia"), { target: { value: "Barrio Ortiz" } });
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "09:00" } });

    await waitFor(() => expect(submit).toBeEnabled());
  });

  it("creates only a service request in Phase 1 behavior", async () => {
    render(<ServiceRequestForm />);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Reparar fuga" } });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Hay una fuga bajo el lavaplatos desde hace dos días." },
    });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Plomería" } });
    fireEvent.change(screen.getByLabelText("Municipio"), { target: { value: "Apartadó" } });
    fireEvent.change(screen.getByLabelText("Dirección o referencia"), { target: { value: "Barrio Ortiz" } });
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "09:00" } });

    fireEvent.click(await screen.findByRole("button", { name: /Publicar solicitud/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc.mock.calls[0][0]).toEqual({ path: "serviceRequests" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- __tests__/components/ServiceRequestForm.test.tsx --runInBand
```

Expected: FAIL because manual validation does not expose per-field Zod messages and submit is not disabled by validity.

- [ ] **Step 3: Create validation schema**

Create `lib/validation/service-request.ts`:

```ts
import { z } from "zod";

export const serviceRequestSchema = z.object({
  title: z.string().trim().min(5, { error: "El título debe tener al menos 5 caracteres." }),
  description: z.string().trim().min(20, { error: "La descripción debe tener al menos 20 caracteres." }),
  category: z.string().min(1, { error: "Selecciona una categoría." }),
  municipality: z.string().min(1, { error: "Selecciona un municipio." }),
  address: z.string().trim().min(5, { error: "Indica una dirección o referencia." }),
  preferredDate: z.string().min(1, { error: "Selecciona una fecha." }),
  preferredTime: z.string().min(1, { error: "Selecciona una hora." }),
});

export type ServiceRequestFormValues = z.infer<typeof serviceRequestSchema>;
```

- [ ] **Step 4: Refactor form imports**

In `components/ServiceRequestForm.tsx`, replace:

```ts
import { FormEvent, useEffect, useState } from "react";
```

with:

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { serviceRequestSchema, type ServiceRequestFormValues } from "@/lib/validation/service-request";
import { Field } from "./ui/Field";
```

- [ ] **Step 5: Initialize React Hook Form**

Inside `ServiceRequestForm`, add:

```ts
const {
  register,
  handleSubmit,
  reset,
  formState: { errors, isValid },
} = useForm<ServiceRequestFormValues>({
  resolver: zodResolver(serviceRequestSchema),
  mode: "onChange",
  defaultValues: {
    title: "",
    description: "",
    category: selectedWorker?.specialties[0] || "",
    municipality: profile?.municipality || "",
    address: "",
    preferredDate: "",
    preferredTime: "",
  },
});
```

When `selectedWorker` or `profile?.municipality` changes after async load, call:

```ts
useEffect(() => {
  reset((current) => ({
    ...current,
    category: current.category || selectedWorker?.specialties[0] || "",
    municipality: current.municipality || profile?.municipality || "",
  }));
}, [profile?.municipality, reset, selectedWorker]);
```

- [ ] **Step 6: Replace submit handler**

Replace `async function submit(event: FormEvent<HTMLFormElement>)` with:

```ts
async function submit(values: ServiceRequestFormValues) {
  setStatus("");
  setError("");

  if (!profile) {
    setError("Inicia sesión para guardar la solicitud en Firestore.");
    return;
  }

  const clientId = profile.uid;
  const payload = {
    clientId,
    ...values,
    photos: [] as string[],
    status: "pending",
    createdAt: serverTimestamp(),
    workerId: selectedWorker?.uid || "",
  };

  try {
    setLoading(true);
    const photos = await Promise.all(files.map((file) => uploadImage(file, `serviceRequests/${clientId}`)));
    const requestRef = await addDoc(collection(db, "serviceRequests"), { ...payload, photos });

    if (selectedWorker) {
      const scheduledAt = `${payload.preferredDate} ${payload.preferredTime}`;
      const bookingRef = await addDoc(collection(db, "bookings"), {
        requestId: requestRef.id,
        clientId,
        workerId: selectedWorker.uid,
        scheduledAt,
        status: "scheduled",
        notes: payload.description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await Promise.all([
        setDoc(doc(db, "jobHistory", `${bookingRef.id}_${clientId}`), {
          bookingId: bookingRef.id,
          userId: clientId,
          clientId,
          workerId: selectedWorker.uid,
          service: payload.title,
          status: "scheduled",
          events: ["Solicitud creada", "Servicio agendado"],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        setDoc(doc(db, "jobHistory", `${bookingRef.id}_${selectedWorker.uid}`), {
          bookingId: bookingRef.id,
          userId: selectedWorker.uid,
          clientId,
          workerId: selectedWorker.uid,
          service: payload.title,
          status: "scheduled",
          events: ["Nueva reserva asignada"],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        createNotification({
          userId: selectedWorker.uid,
          type: "booking",
          title: "Nueva solicitud asignada",
          message: `${profile.fullName} agendó ${payload.title}.`,
          relatedEntityId: bookingRef.id,
          relatedEntityType: "booking",
        }),
      ]);
    }

    await createNotification({
      userId: clientId,
      type: "serviceRequest",
      title: "Solicitud publicada",
      message: selectedWorker ? "Tu solicitud quedó agendada con el trabajador seleccionado." : "Tu solicitud quedó guardada para revisión.",
      relatedEntityId: requestRef.id,
      relatedEntityType: "serviceRequest",
    });

    setStatus("Solicitud publicada. Fotos, solicitud y agenda quedaron guardadas en Firebase.");
    reset();
    setFiles([]);
  } catch {
    setError("No pudimos guardar en Firestore. Revisa la configuración o intenta más tarde.");
  } finally {
    setLoading(false);
  }
}
```

This keeps booking behavior unchanged in Phase 1. The removal of automatic booking is Phase 3.

- [ ] **Step 7: Wire form and fields**

Change the form:

```tsx
<form onSubmit={handleSubmit(submit)} className="grid gap-6 lg:grid-cols-[1fr_360px]">
```

Replace each `label className="field"` with `Field`. Example:

```tsx
<Field label="Título" error={errors.title?.message}>
  <input {...register("title")} placeholder="Ej. Reparar fuga bajo lavaplatos" />
</Field>

<Field label="Descripción" error={errors.description?.message}>
  <textarea {...register("description")} rows={5} placeholder="Cuenta qué ocurre, desde cuándo y qué esperas resolver." />
</Field>

<Field label="Categoría" error={errors.category?.message}>
  <select {...register("category")}>
    <option value="" disabled>
      Selecciona una categoría
    </option>
    {serviceCategories.map((category) => (
      <option key={category} value={category}>
        {category}
      </option>
    ))}
  </select>
</Field>
```

Apply the same pattern to `municipality`, `address`, `preferredDate`, and `preferredTime`.

Update submit button:

```tsx
<button type="submit" className="primary-button mt-5 min-h-12 w-full" disabled={loading || !isValid}>
  {loading ? "Publicando..." : "Publicar solicitud"}
</button>
```

- [ ] **Step 8: Verify form test passes**

Run:

```powershell
npm test -- __tests__/components/ServiceRequestForm.test.tsx --runInBand
```

Expected: PASS.

---

### Task 8: Final Phase 1 Verification

**Files:**
- All Phase 1 files

- [ ] **Step 1: Run all tests**

Run:

```powershell
npm test -- --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Build app**

Run:

```powershell
npm run build
```

Expected: production build completes without TypeScript or Next.js errors.

- [ ] **Step 4: Manual smoke run**

Run:

```powershell
npm run dev
```

Open `http://localhost:3000` and manually check:

- `/buscar` renders directory and filters still work.
- `/dashboard` renders metrics for a logged-in user.
- `/historial` renders loading/empty states without crashing.
- `/mensajes` renders inbox loading/empty states without crashing.
- `/solicitudes/nueva` shows field-level validation and disabled submit until valid.

Expected: no visible runtime error overlay.

## Self-Review

Spec coverage:

- Firebase env variables covered in Task 2.
- `useCollection` covered in Task 3.
- Reusable UI components covered in Task 4.
- Required component refactors covered in Tasks 5 and 6.
- RHF/Zod validation covered in Task 7.
- Critical tests for directory, chat, request form and admin covered in Tasks 5, 6 and 7.

Placeholder scan:

- No `TBD`, `TODO`, or vague implementation-only steps remain.
- Phase 3 booking behavior is explicitly preserved in Task 7 to keep Phase 1 bounded.

Type consistency:

- `CollectionFilter`, `CollectionOrder`, and `UseCollectionOptions` are defined once in `hooks/useCollection.ts`.
- `ServiceRequestFormValues` is inferred from `serviceRequestSchema`.
- Firestore mock helpers return snapshots compatible with the hook and component tests.
