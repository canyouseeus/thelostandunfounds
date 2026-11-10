/**
 * Checks the Venmo and Cash App email parser against real email shapes
 * (amounts and names changed). Run: npx tsx scripts/check-money-email-parse.ts
 */
import assert from 'node:assert/strict';
import { parseMoneyEmail, toCents, cleanMerchant, centralDay } from '../lib/api-handlers/admin/_money-email-parse';

const V = 'venmo@venmo.com';
const C = 'cash@square.com';
const at = '2026-11-10T14:18:39Z';
const p = (from: string, subject: string, text = '', date = at, id = 'm1') => parseMoneyEmail({ id, from, subject, text, date });

assert.equal(toCents('$1,234.56'), 123456);
assert.equal(toCents('$16 00'), 1600);
assert.equal(cleanMerchant('SHELL 57545847303'), 'SHELL');
assert.equal(cleanMerchant('7-ELEVEN 35878'), '7-ELEVEN');
assert.equal(centralDay('2026-11-10T03:12:52Z'), '2026-11-09'); // 9:12pm Central the night before

let r: any = p(V, 'Receipt from CHEVRON 0203165 - $3.24');
assert.equal(r.type, 'ledger');
assert.deepEqual([r.row.kind, r.row.amount, r.row.counterparty, r.row.category, r.row.scope, r.row.source],
  ['expense', 3.24, 'CHEVRON', 'travel', 'personal', 'gmail_venmo']);

r = p(V, 'Updated total from THE LUCKY DUCK', 'THE LUCKY DUCK updated the amount they charged you. On October 29, 2026, you authorized a charge for $7.58. Your new total is $8 98 See below');
assert.equal(r.type, 'adjust');
assert.deepEqual([r.adjust.merchant, r.adjust.fromCents, r.adjust.toCents], ['THE LUCKY DUCK', 758, 898]);

r = p(V, 'Nicole Kuhn paid you $10.00', 'Nicole Kuhn paid you $10.00 Nicole Kuhn paid you $ 10 . 00 Pics See transaction Money credited to your Venmo account. Transaction details Date Oct 31, 2026 Transaction ID 1', '2026-11-01T03:47:02Z');
assert.deepEqual([r.row.kind, r.row.amount, r.row.counterparty, r.row.note, r.row.occurred_on, r.row.scope],
  ['income', 10, 'Nicole Kuhn', 'Pics', '2026-10-31', 'business']);

r = p(V, 'You received $72.13 USD for selling 0.00096908 Bitcoin (BTC)');
assert.deepEqual([r.type, r.row.action, r.row.usd_cents, r.row.sats], ['bitcoin', 'sell', 7213, 96908]);

r = p(V, 'You initiated a $40.00 transfer from APPLE CASH INST XFER');
assert.equal(r.type, 'skip');

r = p(C, "You spent $10.72 at P. Terry's Stand 13");
assert.deepEqual([r.row.amount, r.row.counterparty, r.row.category, r.row.method], [10.72, "P. Terry's Stand 13", 'food', 'Cash App']);

r = p(C, 'You spent $54.99 at Adobe');
assert.deepEqual([r.row.category, r.row.scope], ['software', 'business']);

r = p(C, 'The total for your transaction at Tacowey has been updated from $8.65 to $10.65');
assert.deepEqual([r.type, r.adjust.fromCents, r.adjust.toCents, r.adjust.source], ['adjust', 865, 1065, 'gmail_cashapp']);

r = p(C, 'Payment received', 'Michael Flores paid you $150. M Michael Flores Today For Photo shoot +$150.00 Transaction details');
assert.deepEqual([r.row.kind, r.row.amount, r.row.counterparty, r.row.note], ['income', 150, 'Michael Flores', 'Photo shoot']);

r = p(C, 'You sold bitcoin', 'Bitcoin sell Nov 06 at 10:24 AM $10.44 ₿13893 Trade details Exchange rate $75145.96 Bitcoin amount ₿13893 Total sale amount $10.44 Fees $0.21 Total $10.23');
assert.deepEqual([r.row.action, r.row.usd_cents, r.row.fee_cents, r.row.sats], ['sell', 1044, 21, 13893]);

r = p(C, 'You purchased bitcoin', 'Bitcoin buy Nov 03 at 4:53 PM $172.00 ₿215004 Trade details Exchange rate $78398.54 Bitcoin amount ₿215004 Total purchase amount $168.56 Fees $3.44 Total $172.00');
assert.deepEqual([r.row.action, r.row.usd_cents, r.row.fee_cents, r.row.sats], ['buy', 16856, 344, 215004]);

r = p(C, 'Your withdrawal of ₿96,908 is now confirmed on the blockchain.', 'Bitcoin withdrawal Nov 3 at 7:55 PM $75.00 ₿96908 Tracking');
assert.deepEqual([r.row.action, r.row.usd_cents, r.row.sats], ['withdraw', 7500, 96908]);

r = p(C, 'You received ₿7,442 ($6.00)');
assert.deepEqual([r.row.action, r.row.usd_cents, r.row.sats], ['receive', 600, 7442]);

r = p(C, 'You made a partial payment', 'You only paid $0.15 of your payment because of insufficient funds. The $8.81 left over will be added to your next payment.');
assert.deepEqual([r.row.kind, r.row.amount, r.row.category, r.row.scope], ['expense', 0.15, 'loan', 'personal']);

assert.equal(p(C, 'Your $26.94 payment at Scentbird was declined').type, 'skip');
assert.equal(p(C, 'You borrowed $30').type, 'skip');
assert.equal(p('cash-app@messages.cash.app', 'You spent $5.00 at Shell').type, 'skip');

console.log('money email parser: all checks passed');
