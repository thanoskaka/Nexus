import fs from 'node:fs';
import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { buildHouseholdFinanceBaseline, linkPersonToMember } from '../src/lib/householdFinance';

type SnapshotPortfolio = { id: string; data: Record<string, any> };
type LegacyMember = { email: string; role: 'owner' | 'partner'; uid?: string };

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadEnvFile(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function fingerprint(value: unknown) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex').slice(0, 12);
}

function timestampIso(value: any) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  return null;
}

function normalizeIdentity(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function removeUndefined(value: any): any {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (!value || typeof value !== 'object' || value instanceof FieldValue) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, removeUndefined(nested)]),
  );
}

function selectBaselinePortfolios(portfolios: SnapshotPortfolio[]) {
  const source = [...portfolios]
    .filter((portfolio) => portfolio.data.isPersonal && Array.isArray(portfolio.data.assets))
    .sort((left, right) => right.data.assets.length - left.data.assets.length)[0];
  const target = [...portfolios]
    .filter((portfolio) => !portfolio.data.isPersonal && Array.isArray(portfolio.data.assets))
    .sort((left, right) => right.data.assets.length - left.data.assets.length)[0];
  if (!source || !target) throw new Error('Expected one populated personal source and one populated shared target.');
  return { source, target };
}

function linkPeopleToMembers(state: ReturnType<typeof buildHouseholdFinanceBaseline>, members: LegacyMember[]) {
  let next = state;
  const unmatchedPeople = new Set(next.people.map((person) => person.id));
  const unmatchedMembers = new Map(members.map((member) => [member.email, member]));

  for (const person of next.people) {
    const ownerKey = normalizeIdentity(person.sourceOwnerLabel);
    const candidates = members.filter((member) => {
      const emailLocal = normalizeIdentity(member.email.split('@')[0] || '');
      return ownerKey.length >= 3 && (emailLocal.includes(ownerKey) || ownerKey.includes(emailLocal));
    });
    if (candidates.length !== 1 || !unmatchedMembers.has(candidates[0].email)) continue;
    next = linkPersonToMember(next, person.id, candidates[0]);
    unmatchedPeople.delete(person.id);
    unmatchedMembers.delete(candidates[0].email);
  }

  if (unmatchedPeople.size === 1 && unmatchedMembers.size === 1) {
    const personId = [...unmatchedPeople][0];
    const member = [...unmatchedMembers.values()][0];
    next = linkPersonToMember(next, personId, member);
    unmatchedPeople.clear();
    unmatchedMembers.clear();
  }

  if (unmatchedPeople.size > 0 || unmatchedMembers.size > 0) {
    throw new Error(`Could not safely link ${unmatchedPeople.size} people and ${unmatchedMembers.size} members.`);
  }
  return next;
}

const snapshotPath = readArg('--snapshot');
const envPath = readArg('--env');
const apply = process.argv.includes('--apply');
if (!snapshotPath || !envPath) throw new Error('Usage: --snapshot <path> --env <path> [--apply]');

loadEnvFile(envPath);
const { getFirebaseAdminAuth, getFirebaseAdminFirestore } = await import('../src/server/firebaseAdmin');
const db = getFirebaseAdminFirestore();
const auth = getFirebaseAdminAuth();
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as { portfolios: SnapshotPortfolio[] };
const { source, target } = selectBaselinePortfolios(snapshot.portfolios);

const [sourceLiveSnapshot, targetLiveSnapshot] = await Promise.all([
  db.collection('portfolios').doc(source.id).get(),
  db.collection('portfolios').doc(target.id).get(),
]);
if (!sourceLiveSnapshot.exists || !targetLiveSnapshot.exists) throw new Error('The source or target portfolio no longer exists.');

const sourceLive = sourceLiveSnapshot.data() as Record<string, any>;
const targetLive = targetLiveSnapshot.data() as Record<string, any>;
const sourceSnapshotUpdatedAt = timestampIso(source.data.updatedAt);
const targetSnapshotUpdatedAt = timestampIso(target.data.updatedAt);
if (timestampIso(sourceLive.updatedAt) !== sourceSnapshotUpdatedAt || timestampIso(targetLive.updatedAt) !== targetSnapshotUpdatedAt) {
  throw new Error('Production data changed after the protected snapshot. Take a fresh snapshot before migrating.');
}
if (!Array.isArray(sourceLive.assets) || sourceLive.assets.length !== source.data.assets.length) {
  throw new Error('The live source asset count no longer matches the protected snapshot.');
}

const targetMembersRaw = Array.isArray(targetLive.members) ? targetLive.members as LegacyMember[] : [];
if (targetMembersRaw.length !== 2) throw new Error(`Expected exactly two shared members, found ${targetMembersRaw.length}.`);
const boundMembers: LegacyMember[] = [];
for (const member of targetMembersRaw) {
  const normalizedMember = { ...member, email: member.email.toLowerCase() };
  try {
    const user = await auth.getUserByEmail(member.email);
    boundMembers.push({ ...normalizedMember, uid: user.uid });
  } catch (error: any) {
    const code = error?.code || error?.errorInfo?.code;
    if (code !== 'auth/user-not-found') throw error;
    boundMembers.push({ ...normalizedMember, uid: undefined });
  }
}
const ownerMember = boundMembers.find((member) => member.role === 'owner');
if (!ownerMember?.uid) throw new Error('The shared portfolio owner must have a verified Firebase user before migration.');

let householdFinance = buildHouseholdFinanceBaseline({
  assets: sourceLive.assets,
  members: boundMembers,
});
householdFinance = linkPeopleToMembers(householdFinance, boundMembers);
if (householdFinance.people.length !== 2) throw new Error(`Expected two financial people, found ${householdFinance.people.length}.`);
if (householdFinance.people.some((person) => !person.linkedMemberEmail)) {
  throw new Error('Every financial person must be linked to a household member before migration.');
}

const boundMemberCount = boundMembers.filter((member) => member.uid).length;

const receipt = {
  sourceFingerprint: fingerprint(source.id),
  targetFingerprint: fingerprint(target.id),
  sourceAssetCount: sourceLive.assets.length,
  targetAssetCountBefore: Array.isArray(targetLive.assets) ? targetLive.assets.length : 0,
  personCount: householdFinance.people.length,
  accountCount: householdFinance.accounts.length,
  boundMemberCount,
  pendingUidCount: boundMembers.length - boundMemberCount,
  apply,
};
console.log(JSON.stringify({ phase: 'validated', ...receipt }, null, 2));

if (apply) {
  const batch = db.batch();
  batch.set(targetLiveSnapshot.ref, removeUndefined({
    assets: sourceLive.assets,
    assetClasses: sourceLive.assetClasses,
    baseCurrency: sourceLive.baseCurrency,
    primaryCurrency: sourceLive.primaryCurrency,
    secondaryCurrency: sourceLive.secondaryCurrency,
    currencySettingsVersion: sourceLive.currencySettingsVersion,
    priceProviderSettings: sourceLive.priceProviderSettings,
    members: boundMembers,
    memberEmails: boundMembers.map((member) => member.email),
    ownerEmail: ownerMember.email,
    ownerUid: ownerMember.uid,
    isPersonal: false,
    householdFinance,
    householdMigrationVersion: 1,
    migratedFromPortfolioId: source.id,
    migratedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }), { merge: true });
  batch.set(sourceLiveSnapshot.ref, {
    supersededByPortfolioId: target.id,
    supersededAt: FieldValue.serverTimestamp(),
    supersededReason: 'Canonical shared household migration',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  const [sourceAfter, targetAfter] = await Promise.all([
    sourceLiveSnapshot.ref.get(),
    targetLiveSnapshot.ref.get(),
  ]);
  const sourceAfterData = sourceAfter.data() as Record<string, any>;
  const targetAfterData = targetAfter.data() as Record<string, any>;
  const verified = sourceAfterData.supersededByPortfolioId === target.id
    && Array.isArray(targetAfterData.assets)
    && targetAfterData.assets.length === sourceLive.assets.length
    && targetAfterData.householdFinance?.schemaVersion === 2
    && targetAfterData.members?.filter((member: LegacyMember) => member.uid).length === boundMemberCount;
  if (!verified) throw new Error('The migration write completed but post-write verification failed.');
  console.log(JSON.stringify({ phase: 'applied-and-verified', ...receipt }, null, 2));
}
