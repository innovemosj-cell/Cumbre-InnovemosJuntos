// Helper para subir archivos a Firebase Storage via REST.
// Funciona en edge runtime. Reusa el access token del service account.
//
// Setup:
//   FIREBASE_STORAGE_BUCKET - nombre del bucket sin gs:// (ej:
//                              clasificacion-hackathon.firebasestorage.app)

import { getAccessToken } from './firestore-rest';

function getBucket(): string {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucket) {
    throw new Error('FIREBASE_STORAGE_BUCKET no está configurado.');
  }
  return bucket;
}

export type UploadResult = {
  /** URL pública del archivo (depende de las reglas de Storage). */
  url: string;
  /** Path dentro del bucket. */
  path: string;
};

export async function uploadFile(
  path: string,
  data: ArrayBuffer,
  mimeType: string
): Promise<UploadResult> {
  const bucket = getBucket();
  const accessToken = await getAccessToken();
  const downloadToken = crypto.randomUUID();

  // Estrategia: 2 pasos contra la API de GCS (storage.googleapis.com),
  // que es la que realmente soporta multipart y metadata. El endpoint
  // firebasestorage.googleapis.com/v0 NO soporta uploadType=multipart
  // (devuelve "Metadata part is too large" porque trata el binario como JSON).
  //
  // Paso 1: subir binario simple (uploadType=media) a GCS.
  // Paso 2: PATCH para escribir firebaseStorageDownloadTokens en metadata.
  // El bucket es el mismo recurso físico, así que el URL de lectura sigue
  // siendo firebasestorage.googleapis.com/v0/... con ?token=.

  // ---- Paso 1: upload binario ----
  const uploadUrl =
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o` +
    `?uploadType=media&name=${encodeURIComponent(path)}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      Authorization: `Bearer ${accessToken}`,
    },
    body: data,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    console.error('[firebase-storage] upload error:', {
      status: res.status,
      statusText: res.statusText,
      bucket,
      path,
      body: errorText.slice(0, 600),
    });
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed?.error?.message ?? errorText;
    } catch {}
    throw new Error(
      `Firebase Storage upload falló (${res.status}): ${detail.slice(0, 250)}`
    );
  }

  // ---- Paso 2: PATCH metadata para incluir firebaseStorageDownloadTokens ----
  // Sin esto, las Security Rules deciden quién puede leer; con el token,
  // cualquiera con la URL puede leer el archivo (lo que queremos para
  // reproducir el audio en el <audio> sin auth).
  const encodedPath = encodeURIComponent(path);
  const patchUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    }),
  });
  if (!patchRes.ok) {
    const errorText = await patchRes.text().catch(() => '');
    console.error('[firebase-storage] metadata patch error:', {
      status: patchRes.status,
      bucket,
      path,
      body: errorText.slice(0, 600),
    });
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed?.error?.message ?? errorText;
    } catch {}
    throw new Error(
      `Firebase Storage set-token falló (${patchRes.status}): ${detail.slice(0, 250)}`
    );
  }

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  return { url: publicUrl, path };
}

export async function deleteFile(path: string): Promise<void> {
  const bucket = getBucket();
  const token = await getAccessToken();
  const encodedPath = encodeURIComponent(path);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const errorText = await res.text().catch(() => '');
    console.error('[firebase-storage] delete error:', {
      status: res.status,
      path,
      body: errorText.slice(0, 300),
    });
    throw new Error(`Firebase Storage delete falló: ${res.status}`);
  }
}
