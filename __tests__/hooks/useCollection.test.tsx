import { act, renderHook, waitFor } from "@testing-library/react";
import {
  makeSnapshot,
  mockCollection,
  mockDb,
  mockGetDocs,
  mockOnSnapshot,
  mockOrderBy,
  mockQuery,
  mockUnsubscribe,
  mockWhere,
  resetFirestoreMocks,
} from "../../test-utils/firebase-mock";
import { useCollection } from "@/hooks/useCollection";

jest.mock("@/firebase", () => ({
  db: jest.requireActual("../../test-utils/firebase-mock").mockDb,
}), { virtual: true });

jest.mock("../../firebase", () => ({
  db: jest.requireActual("../../test-utils/firebase-mock").mockDb,
}));

jest.mock("firebase/firestore", () => jest.requireActual("../../test-utils/firebase-mock").mockFirestore);

type Worker = {
  id: string;
  name: string;
};

class Timestamp {
  constructor(
    readonly seconds: number,
    readonly nanoseconds: number,
  ) {}
}

class TimestampWithMillis {
  constructor(private readonly milliseconds: number) {}

  toMillis() {
    return this.milliseconds;
  }
}

class GeoPoint {
  constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {}
}

class BytesWithBase64 {
  constructor(private readonly value: string) {}

  toBase64() {
    return this.value;
  }
}

class BytesWithArray {
  constructor(private readonly value: number[]) {}

  toUint8Array() {
    return Uint8Array.from(this.value);
  }
}

class DocumentReference {
  constructor(readonly path: string) {}
}

class UnsupportedValue {
  constructor(readonly value: string) {}
}

describe("useCollection", () => {
  beforeEach(() => {
    resetFirestoreMocks();
  });

  it("loads document ids and data once when realtime is false", async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeSnapshot([
        { id: "worker-1", data: { name: "Ana" } },
        { id: "worker-2", data: { name: "Luis" } },
      ]),
    );

    const { result } = renderHook(() =>
      useCollection<Worker>("workers", [], { realtime: false }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([
      { id: "worker-1", name: "Ana" },
      { id: "worker-2", name: "Luis" },
    ]);
    expect(result.current.error).toBe("");
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it("uses the Firestore document id when stored data also contains an id", async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeSnapshot([
        { id: "firestore-id", data: { id: "stored-id", name: "Ana" } },
      ]),
    );

    const { result } = renderHook(() =>
      useCollection<Worker>("workers", [], { realtime: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([
      { id: "firestore-id", name: "Ana" },
    ]);
  });

  it("receives realtime snapshots and unsubscribes on unmount", () => {
    const snapshot = makeSnapshot([{ id: "worker-1", data: { name: "Ana" } }]);
    const { result, unmount } = renderHook(() => useCollection<Worker>("workers"));
    const onNext = mockOnSnapshot.mock.calls[0][1] as (value: typeof snapshot) => void;

    act(() => onNext(snapshot));

    expect(result.current).toEqual({
      data: [{ id: "worker-1", name: "Ana" }],
      loading: false,
      error: "",
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite a synchronous realtime snapshot with loading state", () => {
    const snapshot = makeSnapshot([{ id: "worker-1", data: { name: "Ana" } }]);
    mockOnSnapshot.mockImplementationOnce((_target, onNext) => {
      onNext(snapshot);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useCollection<Worker>("workers"));

    expect(result.current).toEqual({
      data: [{ id: "worker-1", name: "Ana" }],
      loading: false,
      error: "",
    });
  });

  it("does not overwrite a synchronous Firestore setup error with loading state", () => {
    mockCollection.mockImplementationOnce(() => {
      throw new Error("setup failed");
    });

    const { result } = renderHook(() => useCollection<Worker>("workers"));

    expect(result.current).toEqual({
      data: [],
      loading: false,
      error: "No pudimos leer los datos en Firestore.",
    });
  });

  it("returns stable empty state and makes no query when disabled", () => {
    const { result, rerender } = renderHook(() =>
      useCollection<Worker>(
        "workers",
        [{ field: "active", op: "==", value: true }],
        { enabled: false, orderBy: [{ field: "name" }] },
      ),
    );
    const initialData = result.current.data;

    rerender();

    expect(result.current).toEqual({ data: [], loading: false, error: "" });
    expect(result.current.data).toBe(initialData);
    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("applies filters and ordering without re-querying equal inline inputs", async () => {
    mockGetDocs.mockResolvedValue(makeSnapshot([]));
    const { rerender } = renderHook(() =>
      useCollection(
        "workers",
        [{ field: "municipality", op: "==", value: "Bogota" }],
        {
          realtime: false,
          orderBy: [
            { field: "rating", direction: "desc" },
            { field: "name" },
          ],
        },
      ),
    );

    await waitFor(() => expect(mockGetDocs).toHaveBeenCalledTimes(1));
    rerender();

    expect(mockCollection).toHaveBeenCalledWith(mockDb, "workers");
    expect(mockWhere).toHaveBeenCalledWith("municipality", "==", "Bogota");
    expect(mockOrderBy).toHaveBeenNthCalledWith(1, "rating", "desc");
    expect(mockOrderBy).toHaveBeenNthCalledWith(2, "name", "asc");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ path: "workers" }),
      expect.objectContaining({ type: "where" }),
      expect.objectContaining({ field: "rating", direction: "desc" }),
      expect.objectContaining({ field: "name", direction: "asc" }),
    );
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it("does not re-subscribe for equal inline empty-map filter values", () => {
    const { rerender } = renderHook(() =>
      useCollection<Worker>(
        "workers",
        [{ field: "metadata", op: "==", value: {} }],
      ),
    );

    rerender();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Timestamp fields", () => new Timestamp(10, 20)],
    ["Timestamp toMillis", () => new TimestampWithMillis(10_500)],
    ["GeoPoint", () => new GeoPoint(4.711, -74.0721)],
    ["Bytes toBase64", () => new BytesWithBase64("AQID")],
    ["Bytes toUint8Array", () => new BytesWithArray([1, 2, 3])],
    ["DocumentReference", () => new DocumentReference("workers/worker-1")],
    ["Date", () => new Date("2026-06-05T12:00:00.000Z")],
  ])("does not re-subscribe for equivalent inline %s values", (_label, makeValue) => {
    const { rerender } = renderHook(() =>
      useCollection<Worker>(
        "workers",
        [{ field: "value", op: "==", value: makeValue() }],
      ),
    );

    rerender();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it("keeps unsupported class values identity-based", () => {
    const { rerender } = renderHook(
      ({ value }) =>
        useCollection<Worker>(
          "workers",
          [{ field: "value", op: "==", value }],
        ),
      { initialProps: { value: new UnsupportedValue("same") } },
    );

    rerender({ value: new UnsupportedValue("same") });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
  });

  it("clears stale data immediately when filters change", async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeSnapshot([{ id: "worker-1", data: { name: "Ana" } }]))
      .mockReturnValueOnce(new Promise(() => undefined));
    const { result, rerender } = renderHook(
      ({ municipality }) =>
        useCollection<Worker>(
          "workers",
          [{ field: "municipality", op: "==", value: municipality }],
          { realtime: false },
        ),
      { initialProps: { municipality: "Bogota" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ municipality: "Medellin" });

    expect(result.current).toEqual({ data: [], loading: true, error: "" });
  });

  it("clears stale data when disabled and does not expose it when re-enabled", async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeSnapshot([{ id: "worker-1", data: { name: "Ana" } }]))
      .mockReturnValueOnce(new Promise(() => undefined));
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useCollection<Worker>("workers", [], { enabled, realtime: false }),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ enabled: false });
    expect(result.current).toEqual({ data: [], loading: false, error: "" });

    rerender({ enabled: true });
    expect(result.current).toEqual({ data: [], loading: true, error: "" });
  });

  it("returns the Spanish error state for an invalid Date filter without crashing", () => {
    const invalidDate = new Date(Number.NaN);

    const { result } = renderHook(() =>
      useCollection<Worker>(
        "workers",
        [{ field: "createdAt", op: ">=", value: invalidDate }],
      ),
    );

    expect(result.current).toEqual({
      data: [],
      loading: false,
      error: "No pudimos leer los datos en Firestore.",
    });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it("resets mock implementations between tests", () => {
    expect(mockCollection(mockDb, "workers")).toEqual({
      type: "collection",
      path: "workers",
    });
    expect(mockGetDocs()).toBeUndefined();
  });
});
