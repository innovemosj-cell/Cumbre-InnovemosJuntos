// Cliente Firestore REST compatible con Node.js y Cloudflare Workers.
// Usa Web Crypto para firmar el JWT del service account y fetch para
// hablar con la API REST de Firestore. No depende de gRPC.

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

type StructuredQuery = {
  from: { collectionId: string }[];
  where?: any;
  orderBy?: { field: { fieldPath: string }; direction?: 'ASCENDING' | 'DESCENDING' }[];
  limit?: number;
  // Proyección: devuelve solo estos campos. No reduce el número de lecturas
  // facturadas, pero sí el tamaño de la respuesta.
  select?: { fields: { fieldPath: string }[] };
};

let cachedServiceAccount: ServiceAccount | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount {
  if (cachedServiceAccount) return cachedServiceAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('[firestore] FIREBASE_SERVICE_ACCOUNT no está definido.');
    throw new Error('FIREBASE_SERVICE_ACCOUNT no está definido.');
  }
  try {
    cachedServiceAccount = JSON.parse(raw) as ServiceAccount;
  } catch (e: any) {
    console.error('[firestore] FIREBASE_SERVICE_ACCOUNT no es JSON válido.', {
      length: raw.length,
      parseError: e?.message,
    });
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido.');
  }
  const missing: string[] = [];
  if (!cachedServiceAccount.client_email) missing.push('client_email');
  if (!cachedServiceAccount.private_key) missing.push('private_key');
  if (!cachedServiceAccount.project_id) missing.push('project_id');
  if (missing.length > 0) {
    console.error('[firestore] Service account incompleto:', missing);
    throw new Error(`Service account incompleto, falta: ${missing.join(', ')}`);
  }
  return cachedServiceAccount;
}

function getProjectId(): string {
  const sa = getServiceAccount();
  return sa.project_id;
}

function baseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function base64urlFromString(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlFromBytes(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');
  const bin = atob(cleaned);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function signJwt(claims: object, privateKeyPem: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = base64urlFromString(JSON.stringify(header));
  const payloadB64 = base64urlFromString(JSON.stringify(claims));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64urlFromBytes(new Uint8Array(sig))}`;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    {
      iss: sa.client_email,
      // cloud-platform cubre Firestore + Storage + cualquier otro GCP API.
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    sa.private_key
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fallo al obtener access token: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

// ---------- Conversores Value <-> JS ----------

function toValue(v: any): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const k of Object.keys(v)) {
      if (v[k] !== undefined) fields[k] = toValue(v[k]);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Tipo no soportado: ${typeof v}`);
}

function fromValue(v: FirestoreValue): any {
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    const fields = v.mapValue.fields || {};
    for (const k of Object.keys(fields)) out[k] = fromValue(fields[k]);
    return out;
  }
  return null;
}

function objectToFields(obj: Record<string, any>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) fields[k] = toValue(obj[k]);
  }
  return fields;
}

function docToObject<T = any>(doc: FirestoreDocument): T {
  const out: any = {};
  const fields = doc.fields || {};
  for (const k of Object.keys(fields)) out[k] = fromValue(fields[k]);
  if (doc.name) {
    const parts = doc.name.split('/');
    out.id = parts[parts.length - 1];
  }
  return out as T;
}

function nestedObjectForPath(path: string, value: any): Record<string, any> {
  const parts = path.split('.');
  let obj: any = value;
  for (let i = parts.length - 1; i >= 0; i--) {
    obj = { [parts[i]]: obj };
  }
  return obj;
}

// ---------- HTTP helpers ----------

async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

// ---------- API pública ----------

// fieldPaths (opcional) aplica una máscara: devuelve solo esos campos. No
// reduce la lectura facturada (siempre es 1 doc) pero sí la respuesta, y
// evita traer campos sensibles o pesados que no se necesitan.
export async function getDoc<T = any>(
  path: string,
  fieldPaths?: string[]
): Promise<T | null> {
  const url = new URL(`${baseUrl()}/${path}`);
  for (const p of fieldPaths ?? []) {
    url.searchParams.append('mask.fieldPaths', p);
  }
  const res = await authedFetch(url.toString());
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore GET ${path} falló: ${res.status} ${text}`);
  }
  const doc = (await res.json()) as FirestoreDocument;
  return docToObject<T>(doc);
}

export async function listDocs<T = any>(collection: string): Promise<T[]> {
  const results: T[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${baseUrl()}/${collection}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await authedFetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firestore list ${collection} falló: ${res.status} ${text}`);
    }
    const json = (await res.json()) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
    };
    for (const d of json.documents || []) results.push(docToObject<T>(d));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return results;
}

export async function setDoc(path: string, data: Record<string, any>): Promise<void> {
  const fields = objectToFields(data);
  const res = await authedFetch(`${baseUrl()}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore set ${path} falló: ${res.status} ${text}`);
  }
}

// Crea un documento SOLO si no existe (operación atómica en Firestore).
// Devuelve 'exists' si ya había un documento con ese id, sin sobrescribirlo.
// Se usa para garantizar un único voto por persona en la votación pública.
export async function createDoc(
  collection: string,
  documentId: string,
  data: Record<string, any>
): Promise<'created' | 'exists'> {
  const fields = objectToFields(data);
  const url = new URL(`${baseUrl()}/${collection}`);
  url.searchParams.set('documentId', documentId);
  const res = await authedFetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (res.status === 409) return 'exists';
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Firestore create ${collection}/${documentId} falló: ${res.status} ${text}`
    );
  }
  return 'created';
}

export async function updateDoc(
  path: string,
  data: Record<string, any>,
  fieldPaths?: string[]
): Promise<void> {
  const url = new URL(`${baseUrl()}/${path}`);
  const paths = fieldPaths ?? Object.keys(data);
  for (const p of paths) url.searchParams.append('updateMask.fieldPaths', p);
  const fields = objectToFields(data);
  const res = await authedFetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore update ${path} falló: ${res.status} ${text}`);
  }
}

function quoteFieldPath(fieldPath: string): string {
  return fieldPath
    .split('.')
    .map((seg) => {
      if (/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(seg)) return seg;
      return '`' + seg.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
    })
    .join('.');
}

export async function updateNestedField(
  path: string,
  fieldPath: string,
  value: any
): Promise<void> {
  const data = nestedObjectForPath(fieldPath, value);
  await updateDoc(path, data, [quoteFieldPath(fieldPath)]);
}

export async function deleteDoc(path: string): Promise<void> {
  const res = await authedFetch(`${baseUrl()}/${path}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Firestore delete ${path} falló: ${res.status} ${text}`);
  }
}

export async function runQuery<T = any>(query: StructuredQuery): Promise<T[]> {
  const res = await authedFetch(`${baseUrl()}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore runQuery falló: ${res.status} ${text}`);
  }
  const rows = (await res.json()) as { document?: FirestoreDocument }[];
  return rows.filter((r) => r.document).map((r) => docToObject<T>(r.document!));
}

export type BatchWrite =
  | { type: 'set'; path: string; data: Record<string, any> }
  | { type: 'update'; path: string; data: Record<string, any>; fieldPaths?: string[] }
  | { type: 'delete'; path: string };

export async function commitBatch(writes: BatchWrite[]): Promise<void> {
  if (writes.length === 0) return;
  const projectPath = `projects/${getProjectId()}/databases/(default)/documents`;
  const apiWrites = writes.map((w) => {
    if (w.type === 'delete') {
      return { delete: `${projectPath}/${w.path}` };
    }
    if (w.type === 'set') {
      return {
        update: {
          name: `${projectPath}/${w.path}`,
          fields: objectToFields(w.data),
        },
      };
    }
    const paths = w.fieldPaths ?? Object.keys(w.data);
    return {
      update: {
        name: `${projectPath}/${w.path}`,
        fields: objectToFields(w.data),
      },
      updateMask: { fieldPaths: paths },
    };
  });

  const res = await authedFetch(
    `https://firestore.googleapis.com/v1/${projectPath}:commit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: apiWrites }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore commit falló: ${res.status} ${text}`);
  }
}

export function newDocId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export function fieldEquals(field: string, value: any) {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: 'EQUAL',
      value: toValue(value),
    },
  };
}
