import firestore from '@react-native-firebase/firestore';

import type {BoothAvailabilityStatus} from './markets';

export type BoothTempLock = {
  id: string;
  organizationId: number;
  marketId: number;
  floorPlanId: number;
  boothId: number;
  date: string;
  ownerId: string;
  ownerLabel: string;
  expiresAtMs: number;
  updatedAtMs: number;
};

export type BoothTempLockMap = Map<string, BoothTempLock>;

const TEMP_LOCK_COLLECTION = 'booth_temp_locks';
const TEMP_LOCK_TTL_MS = 2 * 60 * 1000;

export function tempLockKey(boothId: number, date: string) {
  return `${boothId}:${date}`;
}

export function tempLockDocId(organizationId: number, boothId: number, date: string) {
  return `${organizationId}_${boothId}_${date}`;
}

export function isTempLockActive(lock: BoothTempLock, nowMs = Date.now()) {
  return Number(lock.expiresAtMs || 0) > nowMs;
}

export function isTempLockOwnedBy(lock: BoothTempLock, ownerId: string) {
  return String(lock.ownerId || '') === ownerId;
}

export function availabilityStatusWithTempLock(
  baseStatus: BoothAvailabilityStatus,
  locks: BoothTempLock[],
  ownerId: string,
) {
  if (baseStatus === 'booked' || baseStatus === 'unavailable') {
    return baseStatus;
  }
  const hasOtherActiveLock = locks.some((lock) => isTempLockActive(lock) && !isTempLockOwnedBy(lock, ownerId));
  return hasOtherActiveLock ? 'processing' : baseStatus;
}

export function subscribeFloorPlanTempLocks({
  organizationId,
  marketId,
  floorPlanId,
  dates,
  onChange,
}: {
  organizationId: number;
  marketId: number;
  floorPlanId: number;
  dates: string[];
  onChange: (locks: BoothTempLockMap) => void;
}) {
  if (!dates.length) {
    onChange(new Map());
    return () => {};
  }

  const sortedDates = [...dates].sort();
  const selectedDateSet = new Set(sortedDates);
  const unsubscribe = firestore()
    .collection(TEMP_LOCK_COLLECTION)
    .where('organizationId', '==', organizationId)
    .where('marketId', '==', marketId)
    .where('floorPlanId', '==', floorPlanId)
    .where('date', '>=', sortedDates[0])
    .where('date', '<=', sortedDates[sortedDates.length - 1])
    .onSnapshot(
      (snapshot) => {
        const nowMs = Date.now();
        const locks = new Map<string, BoothTempLock>();
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<BoothTempLock, 'id'>;
          if (!selectedDateSet.has(data.date)) {
            return;
          }
          const lock = {id: doc.id, ...data};
          if (!isTempLockActive(lock, nowMs)) {
            return;
          }
          locks.set(tempLockKey(lock.boothId, lock.date), lock);
        });
        onChange(locks);
      },
      () => onChange(new Map()),
    );

  return unsubscribe;
}

export async function acquireBoothTempLocks({
  organizationId,
  marketId,
  floorPlanId,
  boothId,
  dates,
  ownerId,
  ownerLabel,
}: {
  organizationId: number;
  marketId: number;
  floorPlanId: number;
  boothId: number;
  dates: string[];
  ownerId: string;
  ownerLabel: string;
}) {
  const db = firestore();
  const nowMs = Date.now();
  const expiresAtMs = nowMs + TEMP_LOCK_TTL_MS;
  const docRefs = dates.map((date) => ({
    date,
    ref: db.collection(TEMP_LOCK_COLLECTION).doc(tempLockDocId(organizationId, boothId, date)),
  }));

  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(docRefs.map(({ref}) => transaction.get(ref)));
    snapshots.forEach((snapshot) => {
      if (!snapshot.exists) {
        return;
      }
      const lock = {id: snapshot.id, ...(snapshot.data() as Omit<BoothTempLock, 'id'>)};
      if (isTempLockActive(lock, nowMs) && !isTempLockOwnedBy(lock, ownerId)) {
        throw new Error('TEMP_LOCK_CONFLICT');
      }
    });

    docRefs.forEach(({date, ref}) => {
      transaction.set(ref, {
        organizationId,
        marketId,
        floorPlanId,
        boothId,
        date,
        ownerId,
        ownerLabel,
        expiresAtMs,
        updatedAtMs: nowMs,
      });
    });
  });

  return docRefs.map(({date, ref}) => ({date, docId: ref.id, expiresAtMs}));
}

export async function releaseBoothTempLocks(docIds: string[]) {
  if (!docIds.length) {
    return;
  }
  const batch = firestore().batch();
  docIds.forEach((docId) => {
    batch.delete(firestore().collection(TEMP_LOCK_COLLECTION).doc(docId));
  });
  await batch.commit();
}

export const BOOTH_TEMP_LOCK_TTL_SECONDS = Math.floor(TEMP_LOCK_TTL_MS / 1000);

