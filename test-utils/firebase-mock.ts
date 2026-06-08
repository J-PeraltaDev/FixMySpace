type DocumentValue = Record<string, unknown>;

export type MockSnapshot = {
  docs: Array<{
    id: string;
    data: () => DocumentValue;
  }>;
};

export const mockDb = { name: "mock-firestore" };
export const mockUnsubscribe = jest.fn();

const collectionImplementation = (_db: unknown, path: string) => ({
  type: "collection",
  path,
});
const whereImplementation = (field: string, op: string, value: unknown) => ({
  type: "where",
  field,
  op,
  value,
});
const orderByImplementation = (field: string, direction = "asc") => ({
  type: "orderBy",
  field,
  direction,
});
const queryImplementation = (source: unknown, ...constraints: unknown[]) => ({
  type: "query",
  source,
  constraints,
});
const onSnapshotImplementation = (
  _target: unknown,
  _onNext: (snapshot: MockSnapshot) => void,
  _onError: () => void,
) => {
  void _target;
  void _onNext;
  void _onError;
  return mockUnsubscribe;
};

export const mockCollection = jest.fn(collectionImplementation);
export const mockWhere = jest.fn(whereImplementation);
export const mockOrderBy = jest.fn(orderByImplementation);
export const mockQuery = jest.fn(queryImplementation);
export const mockGetDocs = jest.fn();
export const mockOnSnapshot = jest.fn(onSnapshotImplementation);

export const mockFirestore = {
  collection: mockCollection,
  getDocs: mockGetDocs,
  onSnapshot: mockOnSnapshot,
  orderBy: mockOrderBy,
  query: mockQuery,
  where: mockWhere,
};

export function makeSnapshot(documents: Array<{ id: string; data: DocumentValue }>): MockSnapshot {
  return {
    docs: documents.map(({ id, data }) => ({
      id,
      data: () => data,
    })),
  };
}

export function resetFirestoreMocks() {
  mockUnsubscribe.mockReset();
  mockCollection.mockReset().mockImplementation(collectionImplementation);
  mockWhere.mockReset().mockImplementation(whereImplementation);
  mockOrderBy.mockReset().mockImplementation(orderByImplementation);
  mockQuery.mockReset().mockImplementation(queryImplementation);
  mockGetDocs.mockReset();
  mockOnSnapshot.mockReset().mockImplementation(onSnapshotImplementation);
}
