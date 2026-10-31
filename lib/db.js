import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  doc,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebase, isFirebaseConfigured } from './firebase';
import { buildSeedComplaints } from './seed';
import { compressImage } from './image';

const LS_KEY = 'hs_complaints_v2';
const listeners = new Set();

let broadcast = null;
if (typeof window !== 'undefined') {
  if ('BroadcastChannel' in window) {
    try {
      broadcast = new BroadcastChannel('hs_complaints_sync');
      broadcast.onmessage = () => emitLocal();
    } catch {
      broadcast = null;
    }
  }
  window.addEventListener('storage', (event) => {
    if (event.key === LS_KEY) emitLocal();
  });
}

function readLocalRaw() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function ensureLocal() {
  const existing = readLocalRaw();
  if (existing) return existing;
  const seeded = buildSeedComplaints();
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(seeded));
  } catch {
    /* storage may be full or disabled */
  }
  return seeded;
}

function emitLocal() {
  const data = ensureLocal();
  listeners.forEach((cb) => {
    try {
      cb(data);
    } catch (err) {
      console.warn('[db] listener error', err);
    }
  });
}

function writeLocal(list) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[db] local write failed', err);
  }
  emitLocal();
  try {
    broadcast?.postMessage({ type: 'update' });
  } catch {
    /* ignore */
  }
}

function subscribeLocal(onData) {
  listeners.add(onData);
  onData(ensureLocal());
  return () => listeners.delete(onData);
}

let seedState = 'idle';

async function maybeSeedFirestore(fb, docs) {
  if (seedState !== 'idle' || docs.length > 0) return;
  seedState = 'running';
  try {
    const seeds = buildSeedComplaints();
    await Promise.all(seeds.map((item) => setDoc(doc(fb.db, 'complaints', item.id), item)));
    seedState = 'done';
  } catch (err) {
    console.warn('[db] could not seed Firestore (check rules)', err);
    seedState = 'done';
  }
}

/**
 * Realtime complaints subscription.
 * Uses Firestore when configured, otherwise a local realtime store (BroadcastChannel).
 */
export function subscribeComplaints(onData, onMeta) {
  if (isFirebaseConfigured() && typeof window !== 'undefined') {
    const fb = getFirebase();
    if (fb) {
      let localUnsub = null;
      let fellBack = false;
      const q = query(collection(fb.db, 'complaints'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          onMeta?.({ mode: 'firebase' });
          onData(list);
          maybeSeedFirestore(fb, list);
        },
        (error) => {
          console.warn('[db] Firestore unavailable, falling back to local', error?.message);
          if (fellBack) return;
          fellBack = true;
          onMeta?.({ mode: 'local', error: error?.message });
          localUnsub = subscribeLocal(onData);
        }
      );
      return () => {
        unsub();
        if (localUnsub) localUnsub();
      };
    }
  }
  onMeta?.({ mode: 'local' });
  return subscribeLocal(onData);
}

export async function createComplaint(data) {
  const payload = {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured()) {
    const fb = getFirebase();
    if (fb) {
      try {
        const docRef = await addDoc(collection(fb.db, 'complaints'), payload);
        return { id: docRef.id, mode: 'firebase' };
      } catch (err) {
        console.warn('[db] Firestore write failed, saving locally', err);
      }
    }
  }

  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record = { ...payload, id };
  writeLocal([record, ...ensureLocal()]);
  return { id, mode: 'local' };
}

export async function setComplaintStatus(id, status) {
  const updatedAt = new Date().toISOString();

  if (isFirebaseConfigured()) {
    const fb = getFirebase();
    if (fb) {
      try {
        await updateDoc(doc(fb.db, 'complaints', id), { status, updatedAt });
        return { ok: true, mode: 'firebase' };
      } catch (err) {
        console.warn('[db] status update failed in Firestore', err);
      }
    }
  }

  const list = ensureLocal();
  const next = list.map((item) => (item.id === id ? { ...item, status, updatedAt } : item));
  writeLocal(next);
  return { ok: true, mode: 'local' };
}

export async function uploadComplaintImage(file, complaintId) {
  if (isFirebaseConfigured()) {
    const fb = getFirebase();
    if (fb?.storage) {
      try {
        const safeName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `complaints/${complaintId || Date.now()}/${Date.now()}-${safeName}`;
        const ref = storageRef(fb.storage, path);
        await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
        const url = await getDownloadURL(ref);
        return { url, storage: 'firebase' };
      } catch (err) {
        console.warn('[db] Storage upload failed, using inline image', err);
      }
    }
  }
  const dataUrl = await compressImage(file);
  return { url: dataUrl, storage: 'inline' };
}

export function getLocalComplaints() {
  return ensureLocal();
}
