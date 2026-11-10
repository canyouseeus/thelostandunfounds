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

r = p(V, 'You paid Craig Jackson $10.00', 'You paid Craig Jackson $10.00 You paid Craig Jackson $ 10 . 00 Pedicab See transaction Transaction details Date Apr 19, 2026 Status Pending Transaction ID 1 Payment Method Venmo', '2026-04-20T02:10:00Z');
assert.deepEqual([r.row.kind, r.row.amount, r.row.counterparty, r.row.note, r.row.occurred_on, r.row.scope],
  ['expense', 10, 'Craig Jackson', 'Pedicab', '2026-04-19', 'personal']);

r = p(V, 'Venmo Rewards paid you $0.43', 'Venmo Rewards paid you 0.43! Venmo Rewards paid you $ 0 . 43 Cash back on your purchase at TARGET STORE T3342 Like Comment See transaction');
assert.deepEqual([r.row.kind, r.row.amount, r.row.category, r.row.scope, r.row.note], ['income', 0.43, 'other', 'personal', 'Cash back at TARGET STORE T3342']);

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
assert.equal(r.type, 'skip'); // Afterpay installment: the purchase is already logged

r = p(C, "Your refund for $33.70 from Jerry's Artarama Austi is now available in Cash App.");
assert.deepEqual([r.type, r.row.kind, r.row.amount, r.row.counterparty, r.row.note], ['ledger', 'income', 33.7, "Jerry's Artarama Austi", 'Refund']);
assert.equal(p(C, "Your refund for $33.70 from Jerry's Artarama Austi is being processed. Most refunds are available within 24 hours.").type, 'skip');
assert.equal(p(C, 'Payment scheduled for tomorrow').type, 'skip');

assert.equal(p(C, 'Your $26.94 payment at Scentbird was declined').type, 'skip');
assert.equal(p(C, 'You borrowed $30').type, 'skip');
assert.equal(p('cash-app@messages.cash.app', 'You spent $5.00 at Shell').type, 'skip');

// Shapes seen in the first real import.
r = p(C, 'You spent $6 at Electric Church', 'Electric Church $6.00 Transaction details Pending The merchant is finalizing this purchase.');
assert.deepEqual([r.type, r.row.amount, r.row.counterparty], ['ledger', 6, 'Electric Church']);
r = p(C, "You spent $51.19 at Jerry's Artarama Austi", "Jerry's Artarama Austi Yesterday at 3:16 PM $51.19 Completed Amount $51.19 Source Cash App Card");
assert.deepEqual([r.type, r.adjust.fromCents, r.adjust.toCents], ['adjust', 5119, 5119]);
r = p(C, 'The total for your transaction at Liberty New has been updated from $5 to $7');
assert.deepEqual([r.type, r.adjust.fromCents, r.adjust.toCents], ['adjust', 500, 700]);
r = p(C, 'You received 0.00007138 BTC ($5.00)');
assert.deepEqual([r.type, r.row.action, r.row.usd_cents, r.row.sats], ['bitcoin', 'receive', 500, 7138]);
r = p(C, 'You paid ₿8,292 ($7.00)');
assert.deepEqual([r.row.action, r.row.usd_cents, r.row.sats], ['withdraw', 700, 8292]);
r = p(C, 'You paid 0.00028243\u00a0BTC ($20.01)');
assert.deepEqual([r.row.action, r.row.usd_cents, r.row.sats], ['withdraw', 2001, 28243]);
r = p(C, 'You earned a weekly bitcoin bonus', 'Weekly bitcoin bonus Nov 03 at 3:07 PM $0.00 ₿1 Trade details Exchange rate $77647.45 Bitcoin amount ₿1 Fees $0.00');
assert.deepEqual([r.row.action, r.row.sats], ['bonus', 1]);
r = p(C, 'Payment sent', 'You paid Kaitlyn Cleary $20 Kaitlyn Cleary Today For Food $20.00 Transaction details Complete');
assert.deepEqual([r.row.kind, r.row.amount, r.row.counterparty, r.row.note, r.row.scope], ['expense', 20, 'Kaitlyn Cleary', 'Food', 'personal']);
r = p(C, 'Repayment Overdue', 'Repayment Overdue An interest charge of $0.26 has been applied to your $25.20 overdue repayment.');
assert.deepEqual([r.row.amount, r.row.category, r.row.counterparty], [0.26, 'fees', 'Cash App Borrow']);
assert.equal(p(C, 'Repayment Reminder', 'An interest charge of $0.26 will be applied tomorrow.').type, 'skip');
r = p(C, '$0.07 late fee added');
assert.deepEqual([r.row.amount, r.row.counterparty], [0.07, 'Afterpay']);
r = p(V, 'McKaylyn z paid $7.00 to your Venmo account. Leave it in Venmo or transfer it to your bank account.', 'Mckaylyn z paid you $7.00 Mckaylyn z paid you $ 7 . 00 Photo See transaction Money credited to your Venmo account. Transaction details Date Oct 31, 2026 Transaction ID 5', '2026-11-01T03:33:04Z');
assert.deepEqual([r.row.kind, r.row.amount, r.row.counterparty, r.row.note, r.row.occurred_on], ['income', 7, 'McKaylyn z', 'Photo', '2026-10-31']);

console.log('money email parser: all checks passed');
