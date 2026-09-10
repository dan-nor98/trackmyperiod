import { table, integer, text, index, check, sql } from 'sdk/db';

// A user's records, idempotency ledger and outbox form one atomic aggregate.
// No foreign keys or undocumented multi-call transaction semantics are needed.
export const accounts = table('accounts', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull().default(0),
  role: text('role'),
  partnerId: integer('partner_id').unique(),
  invitation: text('invitation').unique(),
  invitationExpires: integer('invitation_expires'),
  document: text('document').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, t => ({
  roleCheck: check('account_role', sql`role IS NULL OR role IN ('primary','partner')`),
  selfCheck: check('no_self_pairing', sql`partner_id IS NULL OR partner_id != id`),
  grantCheck: check('owner_role', sql`partner_id IS NULL OR role = 'primary'`),
  documentCheck: check('valid_document', sql`json_valid(document)`),
  updated: index('accounts_updated').on(t.updatedAt),
}));

export const jobs = table('jobs', {
  name: text('name').primaryKey(),
  cursor: integer('cursor').notNull().default(0),
});
