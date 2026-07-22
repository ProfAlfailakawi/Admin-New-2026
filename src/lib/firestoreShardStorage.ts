import LZString from 'lz-string';
import {
  deleteDoc,
  getDoc,
  getDocFromServer,
  setDoc,
} from 'firebase/firestore';
import { getSmartDoc } from '../firebase';
import { compressToBase64ViaWorker } from './snapshotCompressor';

// Firestore rejects documents at 1,048,576 bytes. We deliberately stay well below
// that ceiling because Firestore also counts field names and document metadata.
const FIRESTORE_SAFE_DOCUMENT_BYTES = 850_000;
const COMPRESS_SHARD_THRESHOLD = 500_000;
const BASE64_PART_CHARS = 600_000;
const JSON_PART_CHARS = 180_000;

export interface LogicalShardWritePlan {
  key: string;
  baseContent: Record<string, any>;
  partDocuments: Array<{ id: string; content: Record<string, any> }>;
  rawByteLength: number;
  storedByteLength: number;
  isSegmented: boolean;
}

const cloneForFirestore = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const byteSize = (value: any): number => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
};

const splitText = (value: string, maxChars: number): string[] => {
  if (!value) return [''];
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += maxChars) {
    chunks.push(value.slice(offset, offset + maxChars));
  }
  return chunks;
};

const makeGeneration = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const extractPreviousPartIds = (data: any): string[] => {
  if (!data?.__segmentedShard || !Array.isArray(data?.partIds)) return [];
  return data.partIds.map((id: any) => String(id || '')).filter(Boolean);
};

export async function buildLogicalShardWritePlan(
  key: string,
  value: any,
  extraMeta: Record<string, any> = {},
): Promise<LogicalShardWritePlan> {
  const cleanValue = cloneForFirestore(value);
  const rawJson = JSON.stringify(cleanValue);
  const rawByteLength = byteSize(rawJson);

  const directContent = cloneForFirestore({
    ...extraMeta,
    [key]: cleanValue,
    isCompressed: false,
  });
  if (byteSize(directContent) <= FIRESTORE_SAFE_DOCUMENT_BYTES) {
    return {
      key,
      baseContent: directContent,
      partDocuments: [],
      rawByteLength,
      storedByteLength: byteSize(directContent),
      isSegmented: false,
    };
  }

  let compressed = '';
  if (rawJson.length > COMPRESS_SHARD_THRESHOLD) {
    try {
      compressed = (await compressToBase64ViaWorker(rawJson)) || '';
    } catch {
      compressed = '';
    }
  }
  if (!compressed) {
    try {
      compressed = LZString.compressToBase64(rawJson) || '';
    } catch {
      compressed = '';
    }
  }

  if (compressed) {
    const compressedContent = cloneForFirestore({
      ...extraMeta,
      compressedData: compressed,
      isCompressed: true,
    });
    if (byteSize(compressedContent) <= FIRESTORE_SAFE_DOCUMENT_BYTES) {
      return {
        key,
        baseContent: compressedContent,
        partDocuments: [],
        rawByteLength,
        storedByteLength: byteSize(compressedContent),
        isSegmented: false,
      };
    }
  }

  const encoding = compressed ? 'lz64' : 'json';
  const encoded = compressed || rawJson;
  const generation = makeGeneration();
  const chunks = splitText(
    encoded,
    encoding === 'lz64' ? BASE64_PART_CHARS : JSON_PART_CHARS,
  );
  const partIds = chunks.map(
    (_chunk, index) =>
      `${key}__v2__${generation}__${String(index + 1).padStart(4, '0')}`,
  );

  const partDocuments = chunks.map((chunk, index) => ({
    id: partIds[index],
    content: {
      __shardPart: true,
      formatVersion: 2,
      key,
      generation,
      index,
      partCount: chunks.length,
      chunk,
    },
  }));

  // Defensive assertion: no physical document is allowed to approach Firestore's cap.
  for (const part of partDocuments) {
    const size = byteSize(part.content);
    if (size > FIRESTORE_SAFE_DOCUMENT_BYTES) {
      throw new Error(
        `Shard part '${part.id}' is still too large (${size} bytes).`,
      );
    }
  }

  const baseContent = cloneForFirestore({
    ...extraMeta,
    [key]: [],
    isCompressed: false,
    __segmentedShard: true,
    formatVersion: 2,
    key,
    generation,
    encoding,
    partIds,
    partCount: partIds.length,
    encodedLength: encoded.length,
    rawByteLength,
    storedByteLength: byteSize(encoded),
    updatedAt: new Date().toISOString(),
  });

  return {
    key,
    baseContent,
    partDocuments,
    rawByteLength,
    storedByteLength: byteSize(encoded),
    isSegmented: true,
  };
}

export async function commitLogicalShardWritePlan(
  uid: string,
  userEmail: string | null | undefined,
  plan: LogicalShardWritePlan,
): Promise<void> {
  const baseRef = getSmartDoc(
    'appData',
    uid,
    userEmail,
    `shards/${plan.key}`,
  );

  let previousPartIds: string[] = [];
  try {
    const previous = await getDoc(baseRef);
    if (previous.exists()) previousPartIds = extractPreviousPartIds(previous.data());
  } catch {
    // Cleanup is best-effort; inability to inspect an old manifest must not block a safe write.
  }

  // Immutable generation-specific part IDs make the update atomic from readers' point
  // of view: all parts are written first, and the tiny manifest pointer is switched last.
  if (plan.partDocuments.length > 0) {
    await Promise.all(
      plan.partDocuments.map((part) =>
        setDoc(
          getSmartDoc('appData', uid, userEmail, `shards/${part.id}`),
          part.content,
          { merge: false },
        ),
      ),
    );
  }

  await setDoc(baseRef, plan.baseContent, { merge: false });

  const currentIds = new Set(plan.partDocuments.map((part) => part.id));
  const staleIds = previousPartIds.filter((id) => !currentIds.has(id));
  if (staleIds.length > 0) {
    await Promise.allSettled(
      staleIds.map((id) =>
        deleteDoc(getSmartDoc('appData', uid, userEmail, `shards/${id}`)),
      ),
    );
  }
}

export async function writeLogicalAppDataShard(
  uid: string,
  userEmail: string | null | undefined,
  key: string,
  value: any,
  extraMeta: Record<string, any> = {},
): Promise<LogicalShardWritePlan> {
  const plan = await buildLogicalShardWritePlan(key, value, extraMeta);
  await commitLogicalShardWritePlan(uid, userEmail, plan);
  return plan;
}

const decodeLogicalShardData = (key: string, data: any): any => {
  if (!data) return undefined;
  if (data?.isCompressed && data?.compressedData) {
    const decompressed =
      LZString.decompressFromBase64(String(data.compressedData || '')) ||
      LZString.decompressFromUTF16(String(data.compressedData || '')) ||
      '';
    if (!decompressed) return undefined;
    const parsed = JSON.parse(decompressed);
    return parsed?.[key] !== undefined ? parsed[key] : parsed;
  }
  if (data[key] !== undefined) return data[key];
  if (data.items !== undefined) return data.items;
  return undefined;
};

export async function readLogicalAppDataShard(
  uid: string,
  userEmail: string | null | undefined,
  key: string,
  preferServer = true,
): Promise<{ exists: boolean; value: any; manifest: any }> {
  const baseRef = getSmartDoc('appData', uid, userEmail, `shards/${key}`);
  const baseSnap = preferServer
    ? await getDocFromServer(baseRef)
    : await getDoc(baseRef);

  if (!baseSnap.exists()) return { exists: false, value: undefined, manifest: null };
  const manifest = baseSnap.data() as any;

  if (!manifest?.__segmentedShard) {
    return {
      exists: true,
      value: decodeLogicalShardData(key, manifest),
      manifest,
    };
  }

  const partIds = Array.isArray(manifest.partIds)
    ? manifest.partIds.map((id: any) => String(id || '')).filter(Boolean)
    : [];
  if (partIds.length === 0 || partIds.length !== Number(manifest.partCount || 0)) {
    throw new Error(`Shard '${key}' manifest is incomplete.`);
  }

  const partSnaps = await Promise.all(
    partIds.map((id) => {
      const ref = getSmartDoc('appData', uid, userEmail, `shards/${id}`);
      return preferServer
        ? getDocFromServer(ref)
        : getDoc(ref);
    }),
  );

  const chunks = partSnaps.map((snap, index) => {
    if (!snap.exists()) throw new Error(`Shard '${key}' part ${index + 1} is missing.`);
    const data = snap.data() as any;
    if (
      !data?.__shardPart ||
      String(data.key || '') !== key ||
      String(data.generation || '') !== String(manifest.generation || '') ||
      Number(data.index) !== index
    ) {
      throw new Error(`Shard '${key}' part ${index + 1} failed integrity validation.`);
    }
    return String(data.chunk || '');
  });

  const encoded = chunks.join('');
  if (encoded.length !== Number(manifest.encodedLength || encoded.length)) {
    throw new Error(`Shard '${key}' length validation failed.`);
  }

  let rawJson = encoded;
  if (manifest.encoding === 'lz64') {
    rawJson =
      LZString.decompressFromBase64(encoded) ||
      LZString.decompressFromUTF16(encoded) ||
      '';
  }
  if (!rawJson) throw new Error(`Shard '${key}' could not be decompressed.`);

  const parsed = JSON.parse(rawJson);
  return {
    exists: true,
    value: parsed?.[key] !== undefined ? parsed[key] : parsed,
    manifest,
  };
}
