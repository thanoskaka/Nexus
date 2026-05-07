import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';
import type { StorageAdapter, BatchWriter } from './adapter.js';

const DELETE_SENTINEL = { __deleteSentinel: true };

class FirebaseBatchWriter implements BatchWriter {
  private batch = getFirebaseAdminFirestore().batch();

  set(collection: string, docId: string, data: Record<string, unknown>): void {
    this.batch.set(
      getFirebaseAdminFirestore().collection(collection).doc(docId),
      stripDeleteSentinels(data),
      { merge: true },
    );
  }

  delete(collection: string, docId: string): void {
    this.batch.delete(getFirebaseAdminFirestore().collection(collection).doc(docId));
  }

  async commit(): Promise<void> {
    await this.batch.commit();
  }
}

function stripDeleteSentinels(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isDeleteSentinel(value)) {
      result[key] = FieldValue.delete();
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isDeleteSentinel(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).__deleteSentinel === true
  );
}

function mapQueryOp(op: '==' | 'array-contains'): FirebaseFirestore.WhereFilterOp {
  return op;
}

export function createFirebaseAdapter(): StorageAdapter {
  return {
    async getDoc<T>(collection: string, docId: string): Promise<T | null> {
      const snapshot = await getFirebaseAdminFirestore().collection(collection).doc(docId).get();
      if (!snapshot.exists) return null;
      return snapshot.data() as T;
    },

    async setDoc(
      collection: string,
      docId: string,
      data: Record<string, unknown>,
      merge?: boolean,
    ): Promise<void> {
      await getFirebaseAdminFirestore()
        .collection(collection)
        .doc(docId)
        .set(data, merge ? { merge: true } : undefined);
    },

    async updateDoc(
      collection: string,
      docId: string,
      data: Record<string, unknown>,
    ): Promise<void> {
      const docRef = getFirebaseAdminFirestore().collection(collection).doc(docId);
      const existing = await docRef.get();
      if (existing.exists) {
        await docRef.update(stripDeleteSentinels(data));
      } else {
        await docRef.set(data, { merge: true });
      }
    },

    async deleteDoc(collection: string, docId: string): Promise<void> {
      await getFirebaseAdminFirestore().collection(collection).doc(docId).delete();
    },

    async queryWhere<T>(
      collection: string,
      field: string,
      op: '==' | 'array-contains',
      value: unknown,
    ): Promise<T[]> {
      const snapshot = await getFirebaseAdminFirestore()
        .collection(collection)
        .where(field, mapQueryOp(op), value)
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
    },

    batch(): BatchWriter {
      return new FirebaseBatchWriter();
    },

    deleteFieldSentinel(): object {
      return DELETE_SENTINEL;
    },

    async ping(): Promise<boolean> {
      try {
        await getFirebaseAdminFirestore().collection('_health').doc('_check').get();
        return true;
      } catch {
        return false;
      }
    },

    async close(): Promise<void> {
    },
  };
}
