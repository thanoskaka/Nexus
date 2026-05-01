import { getFirebaseAdminFirestore } from '../firebaseAdmin.js';
import type { PortfolioDocument, PortfolioMember } from './types.js';

function normalize(value?: string) {
  return (value || '').trim().toLowerCase();
}

function memberMatchesUser(member: PortfolioMember, user: { uid: string; email?: string }) {
  if (member.uid && member.uid === user.uid) return true;
  const memberEmail = normalize(member.email);
  const userEmail = normalize(user.email);
  return Boolean(memberEmail && userEmail && memberEmail === userEmail);
}

export function isPortfolioMember(doc: PortfolioDocument, user: { uid: string; email?: string }) {
  if (doc.ownerUid && doc.ownerUid === user.uid) return true;
  if (normalize(doc.ownerEmail) && normalize(doc.ownerEmail) === normalize(user.email)) return true;

  const userEmail = normalize(user.email);
  const memberEmails = Array.isArray(doc.memberEmails) ? doc.memberEmails.map(normalize) : [];
  if (userEmail && memberEmails.includes(userEmail)) return true;
  const members = Array.isArray(doc.members) ? doc.members : [];
  return members.some((member) => memberMatchesUser(member, user));
}

export async function getPortfolioById(portfolioId: string) {
  const snapshot = await getFirebaseAdminFirestore().collection('portfolios').doc(portfolioId).get();
  if (!snapshot.exists) return null;
  const raw = snapshot.data() as Omit<PortfolioDocument, 'id'>;
  return {
    id: snapshot.id,
    ...raw,
  } satisfies PortfolioDocument;
}

export async function getPersonalPortfolioByUid(uid: string) {
  const personalId = `user-${uid}`;
  const snapshot = await getFirebaseAdminFirestore().collection('portfolios').doc(personalId).get();
  if (!snapshot.exists) return null;
  const raw = snapshot.data() as Omit<PortfolioDocument, 'id'>;
  return {
    id: snapshot.id,
    ...raw,
  } satisfies PortfolioDocument;
}
