"use client";

import {
  useEffect,
  useEffectEvent,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
  type QuerySnapshot,
  type WhereFilterOp,
} from "firebase/firestore";
import { db } from "@/firebase";

export interface CollectionFilter {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

export interface CollectionOrder {
  field: string;
  direction?: "asc" | "desc";
}

export interface UseCollectionOptions {
  enabled?: boolean;
  realtime?: boolean;
  orderBy?: CollectionOrder[];
}

export interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: string;
}

const ERROR_MESSAGE = "No pudimos leer los datos en Firestore.";
const EMPTY_DATA: never[] = [];
const DISABLED_RESULT = { data: EMPTY_DATA, loading: false, error: "" };
const LOADING_RESULT = { data: EMPTY_DATA, loading: true, error: "" };
const ERROR_RESULT = { data: EMPTY_DATA, loading: false, error: ERROR_MESSAGE };

const objectIds = new WeakMap<object, number>();
let nextObjectId = 1;

function objectId(value: object) {
  const existing = objectIds.get(value);
  if (existing) return existing;

  const id = nextObjectId;
  nextObjectId += 1;
  objectIds.set(value, id);
  return id;
}

function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function firestoreValueSignature(value: object): string | undefined {
  const candidate = value as {
    seconds?: unknown;
    nanoseconds?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    path?: unknown;
    type?: unknown;
    toMillis?: unknown;
    toBase64?: unknown;
    toUint8Array?: unknown;
  };

  if (typeof candidate.seconds === "number" && typeof candidate.nanoseconds === "number") {
    return `timestamp:${candidate.seconds}:${candidate.nanoseconds}`;
  }

  if (typeof candidate.toMillis === "function") {
    return `timestamp-millis:${String(candidate.toMillis())}`;
  }

  if (typeof candidate.latitude === "number" && typeof candidate.longitude === "number") {
    return `geopoint:${candidate.latitude}:${candidate.longitude}`;
  }

  if (typeof candidate.toBase64 === "function") {
    return `bytes-base64:${String(candidate.toBase64())}`;
  }

  if (typeof candidate.toUint8Array === "function") {
    const bytes = candidate.toUint8Array();
    if (bytes instanceof Uint8Array) return `bytes-array:${Array.from(bytes).join(",")}`;
  }

  const constructorName = value.constructor?.name;
  if (
    typeof candidate.path === "string"
    && (candidate.type === "document" || constructorName === "DocumentReference")
  ) {
    return `document-reference:${candidate.path}`;
  }

  return undefined;
}

function stableSerialize(value: unknown, ancestors = new Set<object>()): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "undefined":
      return "undefined";
    case "string":
      return `string:${JSON.stringify(value)}`;
    case "number":
      return `number:${String(value)}`;
    case "boolean":
      return `boolean:${String(value)}`;
    case "bigint":
      return `bigint:${String(value)}`;
    case "symbol":
      return `symbol:${String(value)}`;
    case "function":
      return `function:${objectId(value)}`;
  }

  if (value instanceof Date) return `date:${value.toISOString()}`;
  const firestoreSignature = firestoreValueSignature(value);
  if (firestoreSignature) return firestoreSignature;
  if (ancestors.has(value)) return `circular:${objectId(value)}`;

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return `array:[${value.map((item) => stableSerialize(item, ancestors)).join(",")}]`;
    }

    if (!isPlainObject(value)) return `object:${objectId(value)}`;

    const keys = Object.keys(value).sort();
    return `object:{${keys
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key as keyof typeof value], ancestors)}`)
      .join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

function serializeSafely(value: unknown) {
  try {
    return { signature: stableSerialize(value), error: false };
  } catch {
    return { signature: "serialization-error", error: true };
  }
}

function mapSnapshot<T>(snapshot: QuerySnapshot<DocumentData>) {
  return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }) as T);
}

function startCollectionRead<T>(
  path: string,
  filters: CollectionFilter[],
  orders: CollectionOrder[],
  realtime: boolean,
  queryKey: string,
  setState: Dispatch<SetStateAction<{ queryKey: string; result: UseCollectionResult<T> }>>,
) {
  let active = true;
  let unsubscribe: (() => void) | undefined;

  try {
    const constraints: QueryConstraint[] = [
      ...filters.map((filter) => where(filter.field, filter.op, filter.value)),
      ...orders.map((order) => orderBy(order.field, order.direction ?? "asc")),
    ];
    const collectionQuery = query(collection(db, path), ...constraints);

    const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
      if (!active) return;
      setState({
        queryKey,
        result: { data: mapSnapshot<T>(snapshot), loading: false, error: "" },
      });
    };
    const handleError = () => {
      if (!active) return;
      setState({ queryKey, result: ERROR_RESULT as UseCollectionResult<T> });
    };

    if (realtime) {
      unsubscribe = onSnapshot(collectionQuery, handleSnapshot, handleError);
    } else {
      void getDocs(collectionQuery).then(handleSnapshot).catch(handleError);
    }
  } catch {
    if (active) setState({ queryKey, result: ERROR_RESULT as UseCollectionResult<T> });
  }

  return () => {
    active = false;
    unsubscribe?.();
  };
}

export function useCollection<T>(
  path: string,
  filters: CollectionFilter[] = [],
  options: UseCollectionOptions = {},
): UseCollectionResult<T> {
  const enabled = options.enabled ?? true;
  const realtime = options.realtime ?? true;
  const orders = options.orderBy ?? [];
  const filterSerialization = serializeSafely(filters);
  const orderSerialization = serializeSafely(orders);
  const serializationError = filterSerialization.error || orderSerialization.error;
  const queryKey = [
    path,
    realtime,
    filterSerialization.signature,
    orderSerialization.signature,
  ].join("|");
  const renderKey = `${enabled ? "enabled" : "disabled"}|${serializationError ? "error" : "valid"}|${queryKey}`;
  const initialResult = !enabled
    ? (DISABLED_RESULT as UseCollectionResult<T>)
    : serializationError
      ? (ERROR_RESULT as UseCollectionResult<T>)
      : (LOADING_RESULT as UseCollectionResult<T>);
  const [state, setState] = useState<{
    queryKey: string;
    result: UseCollectionResult<T>;
  }>({
    queryKey: renderKey,
    result: initialResult,
  });

  if (state.queryKey !== renderKey) {
    setState({ queryKey: renderKey, result: initialResult });
  }

  const startReading = useEffectEvent(() =>
    startCollectionRead(path, filters, orders, realtime, renderKey, setState),
  );

  useEffect(() => {
    if (!enabled || serializationError) return;

    return startReading();
  }, [enabled, queryKey, serializationError]);

  if (state.queryKey !== renderKey) return initialResult;
  return state.result;
}
