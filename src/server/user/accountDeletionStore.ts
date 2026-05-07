import { getFirebaseAdminFirestore, getFirebaseAdminAuth } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const PORTFOLIOS_COLLECTION = 'portfolios';
const EXTERNAL_CONNECTIONS_COLLECTION = 'external_connections';
const EXTERNAL_ACCOUNTS_COLLECTION = 'external_accounts';
const EXTERNAL_HOLDINGS_COLLECTION = 'external_holdings';
const EXTERNAL_OVERRIDES_COLLECTION = 'external_asset_overrides';
const EXTERNAL_SYNC_RUNS_COLLECTION = 'external_sync_runs';
const AI_CREDENTIALS_COLLECTION = 'user_ai_credentials';
const SPLITWISE_CONNECTIONS_COLLECTION = 'splitwise_connections';
const SPLITWISE_OAUTH_STATES_COLLECTION = 'splitwise_oauth_states';
const WORKSPACE_OWNERSHIP_COLLECTION = 'user_workspace_ownership';
const ONBOARDING_COLLECTION = 'user_onboarding';

interface PortfolioMember {
  email: string;
  role: 'owner' | 'partner';
  uid?: string;
}

interface PortfolioDocument {
  members?: PortfolioMember[];
  memberEmails?: string[];
  ownerUid?: string;
  ownerEmail?: string;
  isPersonal?: boolean;
  [key: string]: unknown;
}

function getPersonalPortfolioId(uid: string): string {
  return `user-${uid}`;
}

async function deleteCollectionByUid(db: FirebaseFirestore.Firestore, collectionName: string, uid: string, batchSize = 50): Promise<number> {
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    const snapshot = await db
      .collection(collectionName)
      .where('uid', '==', uid)
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < batchSize) {
      hasMore = false;
    }
  }

  return totalDeleted;
}

async function deleteDocIfExists(db: FirebaseFirestore.Firestore, collectionName: string, docId: string): Promise<boolean> {
  const ref = db.collection(collectionName).doc(docId);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    await ref.delete();
    return true;
  }
  return false;
}

export async function deleteUserData(uid: string, email?: string): Promise<{ deleted: Record<string, number> }> {
  const db = getFirebaseAdminFirestore();
  const   deleted: Record<string, number> = {
    externalConnections: 0,
    externalAccounts: 0,
    externalHoldings: 0,
    externalOverrides: 0,
    externalSyncRuns: 0,
    aiCredentials: 0,
    splitwiseConnections: 0,
    splitwiseOAuthStates: 0,
    workspaceOwnership: 0,
    onboarding: 0,
    personalPortfolio: 0,
    sharedPortfolios: 0,
  };

  deleted.externalConnections = await deleteCollectionByUid(db, EXTERNAL_CONNECTIONS_COLLECTION, uid);
  deleted.externalAccounts = await deleteCollectionByUid(db, EXTERNAL_ACCOUNTS_COLLECTION, uid);
  deleted.externalHoldings = await deleteCollectionByUid(db, EXTERNAL_HOLDINGS_COLLECTION, uid);
  deleted.externalOverrides = await deleteCollectionByUid(db, EXTERNAL_OVERRIDES_COLLECTION, uid);
  deleted.externalSyncRuns = await deleteCollectionByUid(db, EXTERNAL_SYNC_RUNS_COLLECTION, uid);

  if (await deleteDocIfExists(db, AI_CREDENTIALS_COLLECTION, uid)) {
    deleted.aiCredentials = 1;
  }
  if (await deleteDocIfExists(db, SPLITWISE_CONNECTIONS_COLLECTION, uid)) {
    deleted.splitwiseConnections = 1;
  }
  if (await deleteDocIfExists(db, SPLITWISE_OAUTH_STATES_COLLECTION, uid)) {
    deleted.splitwiseOAuthStates = 1;
  }
  if (await deleteDocIfExists(db, WORKSPACE_OWNERSHIP_COLLECTION, uid)) {
    deleted.workspaceOwnership = 1;
  }
  if (await deleteDocIfExists(db, ONBOARDING_COLLECTION, uid)) {
    deleted.onboarding = 1;
  }

  const personalPortfolioId = getPersonalPortfolioId(uid);
  if (await deleteDocIfExists(db, PORTFOLIOS_COLLECTION, personalPortfolioId)) {
    deleted.personalPortfolio = 1;
  }

  deleted.sharedPortfolios = 0;
  const seenPortfolioIds = new Set<string>();
  seenPortfolioIds.add(personalPortfolioId);

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const emailSnapshot = await db
      .collection(PORTFOLIOS_COLLECTION)
      .where('memberEmails', 'array-contains', normalizedEmail)
      .get();

    for (const doc of emailSnapshot.docs) {
      if (seenPortfolioIds.has(doc.id)) continue;
      seenPortfolioIds.add(doc.id);
      await handleSharedPortfolio(db, uid, normalizedEmail, doc);
      deleted.sharedPortfolios++;
    }
  }

  const ownerSnapshot = await db
    .collection(PORTFOLIOS_COLLECTION)
    .where('ownerUid', '==', uid)
    .get();

  for (const doc of ownerSnapshot.docs) {
    if (seenPortfolioIds.has(doc.id)) continue;
    seenPortfolioIds.add(doc.id);
    await handleSharedPortfolio(db, uid, email?.trim().toLowerCase() || '', doc);
    deleted.sharedPortfolios++;
  }

  return { deleted };
}

async function handleSharedPortfolio(
  db: FirebaseFirestore.Firestore,
  uid: string,
  normalizedEmail: string,
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<void> {
  const data = doc.data() as PortfolioDocument;
  const members = Array.isArray(data.members) ? data.members : [];

  const userMemberEntry = members.find(
    (m) => m.uid === uid || (normalizedEmail && m.email.toLowerCase() === normalizedEmail),
  );

  const otherOwners = members.filter(
    (m) => m.role === 'owner' && m.uid !== uid && (normalizedEmail ? m.email.toLowerCase() !== normalizedEmail : true),
  );

  const isUserOwner = userMemberEntry?.role === 'owner';
  const isSoleOwner = isUserOwner && otherOwners.length === 0;

  if (isSoleOwner || members.length <= 1) {
    await doc.ref.delete();
  } else {
    const updatedMembers = members.filter(
      (m) => m.uid !== uid && (normalizedEmail ? m.email.toLowerCase() !== normalizedEmail : true),
    );
    const updatedEmails = updatedMembers.map((m) => m.email.toLowerCase());
    await doc.ref.update({
      members: updatedMembers,
      memberEmails: updatedEmails,
      updatedAt: Date.now(),
    });
  }
}

export async function deleteFirebaseAuthUser(uid: string): Promise<void> {
  await getFirebaseAdminAuth().deleteUser(uid);
}
