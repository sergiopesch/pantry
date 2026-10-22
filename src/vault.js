// Payments go through a vault, never through Pantry. The flow:
//   request (Pantry) -> approve (a human, Face ID) -> single-use card issued, locked to one merchant and
//   one amount -> charge -> card dead.
// Pantry-facing surfaces (CLI for the bot, MCP tools) can only request. Approval is a human act.
import { addHours, gbp, iso, round2, shortId } from './util.js';

export class VaultError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const APPROVAL_TTL_MIN = 15;
const CARD_TTL_HOURS = 12;

// Demo driver: same contract as the real vault, no money moves.
export const stubDriver = {
  name: 'stub',
  live: false,
  issueCard({ merchant, cap, now }) {
    return {
      id: shortId('vcard'),
      brand: 'Mastercard',
      last4: String(1000 + Math.floor(Math.random() * 9000)),
      merchant,
      cap,
      issuedAt: iso(now),
      expiresAt: iso(addHours(now, CARD_TTL_HOURS)),
      state: 'live',
    };
  },
  charge({ merchant, amount, now }) {
    return { id: shortId('ch'), status: 'cleared', merchant, amount: round2(amount), at: iso(now), driver: 'stub' };
  },
};

// Agentcard Vault: the card lives on the phone, encrypted with a passkey; Face ID approves each spend.
// Wire its MCP tools here once the developer account is live (see bot/skills/06-pay.md).
export const agentcardDriver = {
  name: 'agentcard',
  live: true,
  issueCard() {
    throw new VaultError('NOT_WIRED', 'Agentcard Vault is not wired yet. Approval must come from Face ID on the phone, not from here.');
  },
  charge() {
    throw new VaultError('NOT_WIRED', 'Agentcard Vault is not wired yet.');
  },
};

export const driverFromEnv = () => (process.env.PANTRY_VAULT === 'agentcard' ? agentcardDriver : stubDriver);

function audit(state, event, details) {
  state.log.push({ at: iso(new Date()), event, ...details });
}

export function requestApproval(state, { merchant, amount, memo, cartHash, slot, now = new Date() }) {
  amount = round2(amount);
  const existing = state.approvals.find(
    a => a.status === 'pending' && a.cartHash === cartHash && a.amount === amount && new Date(a.expiresAt) > now,
  );
  if (existing) return existing;
  for (const a of state.approvals) if (a.status === 'pending') a.status = 'superseded';
  const approval = {
    id: shortId('apr'),
    status: 'pending',
    merchant,
    amount,
    currency: 'GBP',
    memo,
    cartHash,
    slot: slot ? { id: slot.id, start: slot.start, end: slot.end, day: slot.day, window: slot.window } : null,
    requestedAt: iso(now),
    expiresAt: iso(new Date(now.getTime() + APPROVAL_TTL_MIN * 60_000)),
    prompt: `Pantry wants to spend ${gbp(amount)} at ${merchant}.`,
  };
  state.approvals.push(approval);
  audit(state, 'approval.requested', { approval: approval.id, merchant, amount });
  return approval;
}

const find = (state, id) => state.approvals.find(a => a.id === id);

export function approve(state, id, { driver = stubDriver, method = 'face-id', now = new Date() } = {}) {
  const a = find(state, id);
  if (!a) throw new VaultError('NOT_FOUND', 'No such approval.');
  if (a.status !== 'pending') throw new VaultError('NOT_PENDING', `Approval is ${a.status}.`);
  if (now > new Date(a.expiresAt)) {
    a.status = 'expired';
    throw new VaultError('EXPIRED', 'Approval request expired. Ask again.');
  }
  a.card = driver.issueCard({ merchant: a.merchant, cap: a.amount, now });
  a.status = 'approved';
  a.method = method;
  a.approvedAt = iso(now);
  audit(state, 'approval.granted', { approval: a.id, method, card: a.card.id });
  return a;
}

export function decline(state, id, { now = new Date() } = {}) {
  const a = find(state, id);
  if (!a || a.status !== 'pending') throw new VaultError('NOT_PENDING', 'Nothing to decline.');
  a.status = 'declined';
  a.declinedAt = iso(now);
  audit(state, 'approval.declined', { approval: a.id });
  return a;
}

export function charge(state, id, { driver = stubDriver, merchant, amount, now = new Date() } = {}) {
  const a = find(state, id);
  if (!a || a.status !== 'approved') throw new VaultError('NOT_APPROVED', 'No approval on file for this charge. A human has to approve it first.');
  const card = a.card;
  if (!card || card.state !== 'live') throw new VaultError('CARD_DEAD', 'That single-use card is already spent.');
  if (now > new Date(card.expiresAt)) {
    card.state = 'expired';
    throw new VaultError('CARD_EXPIRED', 'The single-use card expired before checkout.');
  }
  if (merchant !== card.merchant) throw new VaultError('WRONG_MERCHANT', `This card only works at ${card.merchant}.`);
  if (round2(amount) > card.cap) throw new VaultError('OVER_CAP', `Approved for ${gbp(card.cap)}, not ${gbp(amount)}.`);
  const receipt = driver.charge({ card, merchant, amount, now });
  card.state = 'dead';
  card.diedAt = iso(now);
  a.status = 'charged';
  a.receipt = receipt;
  audit(state, 'charge.cleared', { approval: a.id, receipt: receipt.id, amount: receipt.amount, merchant });
  return receipt;
}
