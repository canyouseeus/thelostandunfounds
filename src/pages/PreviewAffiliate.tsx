/**
 * PREVIEW ONLY — not a production route.
 * Renders the full Affiliate page (profile + affiliate dashboard) with mock
 * data so it works in Claude Code preview without auth or live API calls.
 *
 * Intercepts both /api/affiliates/* fetch calls AND supabase REST calls.
 * Also injects a fake supabase session so supabase-js proceeds with fetch
 * calls instead of short-circuiting with AuthSessionMissingError.
 */
import { useLayoutEffect } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Affiliate from './Affiliate'
import Footer from '../components/Footer'

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_CODE = 'PREVIEW42'
const MOCK_AFFILIATE_ID = 'preview-affiliate-id'
const MOCK_USER_ID = 'preview-user-id'

const MOCK_AFFILIATE_ROW = {
  id: MOCK_AFFILIATE_ID,
  user_id: MOCK_USER_ID,
  code: MOCK_CODE,
  status: 'active',
  commission_rate: 42,
  total_earnings: 1284.50,
  available_balance: 847.20,
  pending_balance: 437.30,
  total_paid: 0,
  total_clicks: 1842,
  total_conversions: 37,
  created_at: '2024-03-01T00:00:00Z',
  reward_points: 3200,
  discount_credit_balance: 25.00,
  total_mlm_earnings: 142.80,
}

const MOCK_DASHBOARD = {
  affiliate: MOCK_AFFILIATE_ROW,
  overview: {
    total_commissions: 37,
    total_commission_amount: 1284.50,
    total_profit_generated: 3058.33,
    approved_commissions: 29,
    pending_commissions: 6,
    cancelled_commissions: 2,
    total_king_midas_earnings: 215.00,
    pending_payouts: 0,
    paid_payouts: 3,
    top_3_finishes: 8,
    first_place_finishes: 2,
    current_rank: 1,
    profit_trend_7d: 12.4,
    best_day: { date: '2026-05-10', profit: 420.00 },
    average_commission: 34.72,
    average_profit: 82.66,
    conversion_rate: 2.01,
  },
  balance: {
    available_balance: 847.20,
    pending_balance: 437.30,
    total_paid: 0,
    total_cancelled: 48.60,
    total_lifetime: 1284.50,
    upcoming_availability: [
      { date: '2026-05-20', amount: 126.00 },
      { date: '2026-05-27', amount: 311.30 },
    ],
    recent_cancellations: [],
  },
  mlm: {
    network: { total_customers: 142, level1_affiliates: 8, level2_affiliates: 14, total_network: 22 },
    earnings: { mlm_level1: 98.40, mlm_level2: 44.40, total_mlm: 142.80 },
    discount_code: { code: 'PREVIEW10', is_active: true },
  },
  recent_commissions: [
    { id: '1', order_id: 'ord_preview_001', amount: 84.00, profit_generated: 200.00, source: 'shop', status: 'approved', status_label: 'Available May 20', created_at: '2026-05-10T14:22:00Z' },
    { id: '2', order_id: 'ord_preview_002', amount: 42.00, profit_generated: 100.00, source: 'shop', status: 'pending', status_label: 'Pending', created_at: '2026-05-12T09:11:00Z' },
    { id: '3', order_id: 'ord_preview_003', amount: 126.00, profit_generated: 300.00, source: 'gallery', status: 'approved', status_label: 'Available May 27', created_at: '2026-05-13T16:45:00Z' },
    { id: '4', order_id: 'ord_preview_004', amount: 58.80, profit_generated: 140.00, source: 'shop', status: 'paid', status_label: 'Paid', created_at: '2026-04-28T11:30:00Z' },
    { id: '5', order_id: 'ord_preview_005', amount: 21.00, profit_generated: 50.00, source: 'shop', status: 'cancelled', status_label: 'Cancelled', created_at: '2026-04-20T08:00:00Z' },
  ],
  king_midas: {
    recent_stats: [
      { date: '2026-05-14', profit: 420.00, rank: 1, pool_share: 107.50 },
      { date: '2026-05-13', profit: 200.00, rank: 2, pool_share: 64.50 },
    ],
    recent_payouts: [
      { date: '2026-05-07', rank: 1, amount: 95.00, status: 'paid', paid_at: '2026-05-08T00:00:00Z' },
    ],
  },
}

const MOCK_MLM = {
  affiliate: { reward_points: 3200, discount_credit_balance: 25.00, total_mlm_earnings: 142.80 },
  network: MOCK_DASHBOARD.mlm.network,
  earnings: MOCK_DASHBOARD.mlm.earnings,
  discount_code: MOCK_DASHBOARD.mlm.discount_code,
}

// /api/affiliates/* responses keyed by URL segment
const AFFILIATE_API_MOCKS: Record<string, unknown> = {
  'get-by-user':        { isAffiliate: true, affiliate: { code: MOCK_CODE } },
  'dashboard':          MOCK_DASHBOARD,
  'mlm-dashboard':      MOCK_MLM,
  'payout-settings':    { settings: { payment_threshold: 10 } },
  'connect-onboarding': { onboarded: true, status: 'active', stripe_account_id: 'acct_preview', charges_enabled: true, payouts_enabled: true, details_submitted: true, requirements: [] },
  'mlm-earnings':       { earnings: [
    { id: 'mlm1', level: 1, amount: 16.80, profit_source: 840.00, created_at: '2026-05-10T14:22:00Z', from_affiliate: { affiliate_code: 'CREATOR01', status: 'active' }, commission: { order_id: 'ord_m001', amount: 16.80, created_at: '2026-05-10T14:22:00Z' } },
    { id: 'mlm2', level: 1, amount: 8.40,  profit_source: 420.00, created_at: '2026-05-09T11:05:00Z', from_affiliate: { affiliate_code: 'CREATOR01', status: 'active' }, commission: { order_id: 'ord_m002', amount: 8.40,  created_at: '2026-05-09T11:05:00Z' } },
    { id: 'mlm3', level: 2, amount: 4.20,  profit_source: 420.00, created_at: '2026-05-08T09:30:00Z', from_affiliate: { affiliate_code: 'CREATOR02', status: 'active' }, commission: { order_id: 'ord_m003', amount: 4.20,  created_at: '2026-05-08T09:30:00Z' } },
    { id: 'mlm4', level: 1, amount: 21.00, profit_source: 1050.00, created_at: '2026-05-07T16:45:00Z', from_affiliate: { affiliate_code: 'CREATOR03', status: 'active' }, commission: { order_id: 'ord_m004', amount: 21.00, created_at: '2026-05-07T16:45:00Z' } },
    { id: 'mlm5', level: 2, amount: 5.25,  profit_source: 525.00, created_at: '2026-05-06T10:00:00Z', from_affiliate: { affiliate_code: 'CREATOR04', status: 'active' }, commission: { order_id: 'ord_m005', amount: 5.25,  created_at: '2026-05-06T10:00:00Z' } },
  ], totals: { total_earnings: 142.80, level1_earnings: 98.40, level2_earnings: 44.40, total_transactions: 12, level1_transactions: 8, level2_transactions: 4 } },
  'referrals':          {
    level1_affiliates: [
      { id: 'l1-001', affiliate_code: 'CREATOR01', status: 'active',   total_earnings: 312.40, reward_points: 1240, created_at: '2025-11-01T00:00:00Z' },
      { id: 'l1-002', affiliate_code: 'CREATOR03', status: 'active',   total_earnings: 184.20, reward_points: 730,  created_at: '2025-12-15T00:00:00Z' },
      { id: 'l1-003', affiliate_code: 'WANDERER7', status: 'active',   total_earnings: 97.60,  reward_points: 390,  created_at: '2026-01-20T00:00:00Z' },
      { id: 'l1-004', affiliate_code: 'INKSLNGR', status: 'active',   total_earnings: 54.00,  reward_points: 215,  created_at: '2026-02-10T00:00:00Z' },
      { id: 'l1-005', affiliate_code: 'LOSTSOULS', status: 'inactive', total_earnings: 12.80,  reward_points: 50,   created_at: '2026-03-01T00:00:00Z' },
    ],
    level2_affiliates: [
      { id: 'l2-001', affiliate_code: 'CREATOR02', status: 'active',   total_earnings: 88.50,  reward_points: 350, created_at: '2026-01-05T00:00:00Z', referred_by: 'l1-001' },
      { id: 'l2-002', affiliate_code: 'CREATOR04', status: 'active',   total_earnings: 42.00,  reward_points: 168, created_at: '2026-01-18T00:00:00Z', referred_by: 'l1-001' },
      { id: 'l2-003', affiliate_code: 'NIGHTOWL',  status: 'active',   total_earnings: 126.30, reward_points: 505, created_at: '2026-02-03T00:00:00Z', referred_by: 'l1-001' },
      { id: 'l2-004', affiliate_code: 'DRIFTER22', status: 'active',   total_earnings: 63.00,  reward_points: 252, created_at: '2026-02-20T00:00:00Z', referred_by: 'l1-002' },
      { id: 'l2-005', affiliate_code: 'GHOSTLENS', status: 'inactive', total_earnings: 8.40,   reward_points: 33,  created_at: '2026-03-10T00:00:00Z', referred_by: 'l1-002' },
      { id: 'l2-006', affiliate_code: 'RAWPIXELS', status: 'active',   total_earnings: 31.50,  reward_points: 126, created_at: '2026-03-22T00:00:00Z', referred_by: 'l1-003' },
    ],
    customers: [],
    totals: { total_network_size: 22, total_level1_affiliates: 5, total_level2_affiliates: 6 },
    total: 0,
  },
  'payout-history':     { success: true, data: [
    { id: 'pay-001', date_requested: '2026-04-01T10:00:00Z', date_paid: '2026-04-03T14:22:00Z', amount: 210.00, status: 'paid',    method: 'Stripe', transaction_id: 'po_3PxQvD2eZvKYlo2C0001', notes: null, error: null },
    { id: 'pay-002', date_requested: '2026-04-20T09:00:00Z', date_paid: '2026-04-22T11:05:00Z', amount: 168.00, status: 'paid',    method: 'Stripe', transaction_id: 'po_3PxQvD2eZvKYlo2C0002', notes: null, error: null },
    { id: 'pay-003', date_requested: '2026-05-01T08:30:00Z', date_paid: '2026-05-03T16:40:00Z', amount: 315.00, status: 'paid',    method: 'Stripe', transaction_id: 'po_3PxQvD2eZvKYlo2C0003', notes: null, error: null },
    { id: 'pay-004', date_requested: '2026-05-12T14:00:00Z', date_paid: null,                   amount: 126.00, status: 'pending', method: 'Stripe', transaction_id: null, notes: null, error: null },
  ] },
  'request-payout':     { success: true, message: 'Payout request submitted successfully. Funds will be transferred within 2–5 business days.' },
  'products':           { products: [
    // Physical — Fourthwall
    { id: 'fw-001', title: 'Lost Archives Vol. 1 Poster', type: 'physical', price: 34.99, profit: 18.00, url: '/shop/lost-archives-vol-1', salesCount: 312, isHot: true, isNew: false, category: 'prints', image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80' },
    { id: 'fw-002', title: 'Midnight Dispatch Tee',       type: 'physical', price: 42.00, profit: 20.00, url: '/shop/midnight-dispatch-tee', salesCount: 204, isHot: true, isNew: false, category: 'apparel', image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=400&q=80' },
    { id: 'fw-003', title: 'Field Notes Notebook',        type: 'physical', price: 18.00, profit: 9.50,  url: '/shop/field-notes-notebook', salesCount: 189, isHot: false, isNew: false, category: 'stationery', image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=80' },
    { id: 'fw-004', title: 'Unfound Canvas — 18×24"',     type: 'physical', price: 89.00, profit: 44.00, url: '/shop/unfound-canvas', salesCount: 97, isHot: false, isNew: true, category: 'prints', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80' },
    { id: 'fw-005', title: 'Mystery Box',                 type: 'physical', price: 999.00, profit: 499.00, url: '/shop/mystery-box', salesCount: 41, isHot: false, isNew: false, category: 'mystery', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80' },
    { id: 'fw-006', title: 'Dispatch Hoodie',             type: 'physical', price: 68.00, profit: 32.00, url: '/shop/dispatch-hoodie', salesCount: 156, isHot: true, isNew: false, category: 'apparel', image: 'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=400&q=80' },
    { id: 'fw-007', title: 'Archive Print Set (3-Pack)',  type: 'physical', price: 79.00, profit: 38.00, url: '/shop/archive-print-set', salesCount: 88, isHot: false, isNew: true, category: 'prints', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400&q=80' },
    // Digital
    { id: 'dg-001', title: 'Lightroom Preset Pack — Film', type: 'digital', price: 29.00, profit: 29.00, url: '/shop/lr-preset-film', salesCount: 541, isHot: true, isNew: false, category: 'presets', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' },
    { id: 'dg-002', title: 'Street Photography Guide PDF', type: 'digital', price: 19.00, profit: 19.00, url: '/shop/street-guide', salesCount: 378, isHot: false, isNew: false, category: 'guides', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80' },
    { id: 'dg-003', title: 'Dispatch Zine — Issue 01 (PDF)', type: 'digital', price: 8.00, profit: 8.00, url: '/shop/zine-01', salesCount: 622, isHot: true, isNew: false, category: 'zines', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80' },
    { id: 'dg-004', title: 'Dispatch Zine — Issue 02 (PDF)', type: 'digital', price: 8.00, profit: 8.00, url: '/shop/zine-02', salesCount: 290, isHot: false, isNew: true, category: 'zines', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80' },
    { id: 'dg-005', title: 'Editing Masterclass (Video)',  type: 'digital', price: 79.00, profit: 79.00, url: '/shop/editing-masterclass', salesCount: 134, isHot: false, isNew: true, category: 'courses', image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=80' },
    // Gallery — real galleries from the DB
    { id: '6d78991a-f350-4221-9fb1-ede0e8a1c552', title: 'LAST NIGHT',      type: 'gallery', price: 20.00, profit: 20.00, url: '/gallery/last-night',      salesCount: 14, isHot: false, isNew: false, category: 'gallery', image: 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/gallery-photos/covers/1768620596006_DSCF1391.JPG',  pricingTiers: [{ quantity: 1, price: 20.00 }, { quantity: 3, price: 50.00 }] },
    { id: '54cdcf08-9857-4819-9d2b-9702e14815f7', title: 'LAST NIGHT NOIR', type: 'gallery', price: 10.00, profit: 10.00, url: '/gallery/last-night-noir', salesCount:  8, isHot: false, isNew: false, category: 'gallery', image: 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/gallery-photos/covers/1770068827552_DSCF1621.jpeg', pricingTiers: [{ quantity: 1, price: 10.00 }, { quantity: 3, price: 20.00 }, { quantity: 10, price: 50.00 }] },
    // Events — full ticket price is profit
    { id: 'ev-001', title: 'Monthly Meetup — June',       type: 'event', price: 25.00, profit: 25.00, url: '/events?ref=', salesCount: 38, isHot: true,  isNew: false, category: 'events', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80' },
    { id: 'ev-002', title: 'Darkroom Workshop',            type: 'event', price: 85.00, profit: 85.00, url: '/events?ref=', salesCount: 12, isHot: false, isNew: true,  category: 'events', image: 'https://images.unsplash.com/photo-1518982380512-5a3c6c1aacd4?w=400&q=80' },
    { id: 'ev-003', title: 'Street Photography Walk',      type: 'event', price: 40.00, profit: 40.00, url: '/events?ref=', salesCount: 24, isHot: false, isNew: false, category: 'events', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80' },
    { id: 'ev-004', title: 'Year-End Gala (VIP Ticket)',   type: 'event', price: 150.00, profit: 150.00, url: '/events?ref=', salesCount: 7, isHot: true, isNew: true,  category: 'events', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80' },
  ] },
  'points-history':     { total_points: 3200, breakdown: { from_sales: 2800, from_self_purchase: 400, from_referrals: 0 }, history: [] },
  'use-discount':       { code: 'PREVIEW10', is_active: true, discount_percent: 10, usage_count: 0 },
  'check-code':         { available: true },
  'leaderboard':        [],
  'king-midas/ticker':  {
    rankings: [
      { rank: 1, affiliate_code: 'PREVIEW42', profit: 420.00, rank_change: 0, change_direction: 'none' },
      { rank: 2, affiliate_code: 'SHADOW99',  profit: 315.00, rank_change: 1, change_direction: 'up'   },
      { rank: 3, affiliate_code: 'DARKROOM',  profit: 280.00, rank_change: -1, change_direction: 'down' },
      { rank: 4, affiliate_code: 'LENSFLARE', profit: 210.00, rank_change: 0, change_direction: 'none' },
      { rank: 5, affiliate_code: 'GRAINWAVE', profit: 175.00, rank_change: 2, change_direction: 'up'   },
    ],
    site_profit_today: 1400.00,
    king_midas_pot: 147.00,
    last_updated: new Date().toISOString(),
  },
  'king-midas/stats':   { data: [
    // Today — all ranked affiliates; component uses profit_generated (not profit)
    { id: 'mt1', affiliate_id: MOCK_AFFILIATE_ID, date: '2026-05-16', rank: 1, profit_generated: 420.00, pool_share:  73.50 },
    { id: 'mt2', affiliate_id: 'aff-shadow',      date: '2026-05-16', rank: 2, profit_generated: 315.00, pool_share:  44.10 },
    { id: 'mt3', affiliate_id: 'aff-darkroom',    date: '2026-05-16', rank: 3, profit_generated: 280.00, pool_share:  14.70 },
    { id: 'mt4', affiliate_id: 'aff-lensflare',   date: '2026-05-16', rank: 4, profit_generated: 210.00, pool_share:   7.35 },
    { id: 'mt5', affiliate_id: 'aff-grainwave',   date: '2026-05-16', rank: 5, profit_generated: 175.00, pool_share:   7.35 },
  ] },
  'king-midas/payouts': { data: MOCK_DASHBOARD.king_midas.recent_payouts },
}

// Supabase table mock responses (PostgREST returns arrays)
const MOCK_COMMISSIONS = [
  // May cluster — busy week
  { id: 'c01', affiliate_id: MOCK_AFFILIATE_ID, amount: 84.00,  status: 'available', source: 'stripe',       created_at: '2026-05-10T08:00:00Z' },
  { id: 'c1b', affiliate_id: MOCK_AFFILIATE_ID, amount: 42.00,  status: 'available', source: 'photo_order',  created_at: '2026-05-10T14:22:00Z' },
  { id: 'c1c', affiliate_id: MOCK_AFFILIATE_ID, amount: 63.00,  status: 'available', source: 'event_ticket', created_at: '2026-05-10T19:05:00Z' },
  { id: 'c02', affiliate_id: MOCK_AFFILIATE_ID, amount: 42.00,  status: 'pending',   source: 'event_ticket', created_at: '2026-05-12T09:11:00Z' },
  { id: 'c2b', affiliate_id: MOCK_AFFILIATE_ID, amount: 31.50,  status: 'pending',   source: 'stripe',       created_at: '2026-05-12T16:30:00Z' },
  { id: 'c03', affiliate_id: MOCK_AFFILIATE_ID, amount: 126.00, status: 'available', created_at: '2026-05-13T16:45:00Z' },
  { id: 'c12', affiliate_id: MOCK_AFFILIATE_ID, amount: 52.50,  status: 'pending',   created_at: '2026-05-14T07:45:00Z' },
  { id: 'c11', affiliate_id: MOCK_AFFILIATE_ID, amount: 84.00,  status: 'available', created_at: '2026-05-08T15:30:00Z' },
  { id: 'c16', affiliate_id: MOCK_AFFILIATE_ID, amount: 31.50,  status: 'available', created_at: '2026-05-05T11:00:00Z' },
  { id: 'c06', affiliate_id: MOCK_AFFILIATE_ID, amount: 168.00, status: 'available', created_at: '2026-05-01T12:00:00Z' },
  { id: 'c6b', affiliate_id: MOCK_AFFILIATE_ID, amount: 84.00,  status: 'available', created_at: '2026-05-01T18:00:00Z' },
  // April cluster
  { id: 'c04', affiliate_id: MOCK_AFFILIATE_ID, amount: 58.80,  status: 'paid',      created_at: '2026-04-28T11:30:00Z' },
  { id: 'c4b', affiliate_id: MOCK_AFFILIATE_ID, amount: 42.00,  status: 'paid',      created_at: '2026-04-28T15:00:00Z' },
  { id: 'c05', affiliate_id: MOCK_AFFILIATE_ID, amount: 21.00,  status: 'pending',   created_at: '2026-04-20T08:00:00Z' },
  { id: 'c07', affiliate_id: MOCK_AFFILIATE_ID, amount: 63.00,  status: 'paid',      created_at: '2026-04-15T10:00:00Z' },
  { id: 'c7b', affiliate_id: MOCK_AFFILIATE_ID, amount: 42.00,  status: 'paid',      created_at: '2026-04-15T16:00:00Z' },
  { id: 'c7c', affiliate_id: MOCK_AFFILIATE_ID, amount: 21.00,  status: 'paid',      created_at: '2026-04-15T20:00:00Z' },
  { id: 'c08', affiliate_id: MOCK_AFFILIATE_ID, amount: 105.00, status: 'paid',      created_at: '2026-04-10T14:00:00Z' },
  { id: 'c15', affiliate_id: MOCK_AFFILIATE_ID, amount: 42.00,  status: 'paid',      created_at: '2026-04-05T09:00:00Z' },
  { id: 'c18', affiliate_id: MOCK_AFFILIATE_ID, amount: 38.50,  status: 'paid',      created_at: '2026-04-02T16:00:00Z' },
  // March cluster
  { id: 'c09', affiliate_id: MOCK_AFFILIATE_ID, amount: 147.00, status: 'paid',      created_at: '2026-03-25T09:00:00Z' },
  { id: 'c9b', affiliate_id: MOCK_AFFILIATE_ID, amount: 63.00,  status: 'paid',      created_at: '2026-03-25T14:00:00Z' },
  { id: 'c10', affiliate_id: MOCK_AFFILIATE_ID, amount: 189.00, status: 'paid',      created_at: '2026-03-10T11:00:00Z' },
  { id: 'c17', affiliate_id: MOCK_AFFILIATE_ID, amount: 63.00,  status: 'paid',      created_at: '2026-03-01T08:00:00Z' },
  // Feb
  { id: 'c13', affiliate_id: MOCK_AFFILIATE_ID, amount: 73.50,  status: 'paid',      created_at: '2026-02-20T10:00:00Z' },
  { id: 'c14', affiliate_id: MOCK_AFFILIATE_ID, amount: 94.50,  status: 'paid',      created_at: '2026-02-05T14:00:00Z' },
]

// Click events across 90 days — seeded so counts are stable
const MOCK_CLICKS = Array.from({ length: 90 }, (_, i) => {
  const d = new Date('2026-05-14')
  d.setDate(d.getDate() - i)
  const dateStr = d.toISOString().slice(0, 10)
  const count = 10 + ((i * 37 + 13) % 55)   // deterministic 10–64 clicks/day
  return Array.from({ length: count }, (__, j) => ({
    id: `clk-${i}-${j}`,
    affiliate_id: MOCK_AFFILIATE_ID,
    clicked_at: `${dateStr}T${String((j * 23) % 24).padStart(2,'0')}:${String((j * 17) % 60).padStart(2,'0')}:00Z`,
  }))
}).flat()

// Each row includes `affiliates: { code }` to simulate the PostgREST join used by LeaderboardView.
// Competitor codes here MATCH the ticker mock (SHADOW99, DARKROOM, LENSFLARE, GRAINWAVE) so that
// the leaderboard, ticker, and stats cards all tell a consistent story.
// Pool = 10.5% of daily profit (matches king_midas_pot: $147 on a $1,400 day).
const MOCK_MIDAS_STATS = [
  // ── TODAY (2026-05-16) — matches the ticker exactly ──
  { id: 'mt1', affiliate_id: MOCK_AFFILIATE_ID, date: '2026-05-16', rank: 1, profit_generated: 420.00, pool_share:  73.50, affiliates: { code: MOCK_CODE   } },
  { id: 'mt2', affiliate_id: 'aff-shadow',      date: '2026-05-16', rank: 2, profit_generated: 315.00, pool_share:  44.10, affiliates: { code: 'SHADOW99'  } },
  { id: 'mt3', affiliate_id: 'aff-darkroom',    date: '2026-05-16', rank: 3, profit_generated: 280.00, pool_share:  14.70, affiliates: { code: 'DARKROOM'  } },
  { id: 'mt4', affiliate_id: 'aff-lensflare',   date: '2026-05-16', rank: 4, profit_generated: 210.00, pool_share:   7.35, affiliates: { code: 'LENSFLARE' } },
  { id: 'mt5', affiliate_id: 'aff-grainwave',   date: '2026-05-16', rank: 5, profit_generated: 175.00, pool_share:   7.35, affiliates: { code: 'GRAINWAVE' } },
  // ── Our affiliate — prior days ──
  { id: 'm1',  affiliate_id: MOCK_AFFILIATE_ID, date: '2026-05-14', rank: 1, profit_generated: 420.00, pool_share: 107.50, affiliates: { code: MOCK_CODE   } },
  { id: 'm2',  affiliate_id: MOCK_AFFILIATE_ID, date: '2026-05-13', rank: 2, profit_generated: 200.00, pool_share:  64.50, affiliates: { code: MOCK_CODE   } },
  { id: 'm3',  affiliate_id: MOCK_AFFILIATE_ID, date: '2026-05-10', rank: 1, profit_generated: 380.00, pool_share:  95.00, affiliates: { code: MOCK_CODE   } },
  { id: 'm4',  affiliate_id: MOCK_AFFILIATE_ID, date: '2026-05-07', rank: 3, profit_generated: 150.00, pool_share:  28.00, affiliates: { code: MOCK_CODE   } },
  { id: 'm5',  affiliate_id: MOCK_AFFILIATE_ID, date: '2026-05-03', rank: 2, profit_generated: 290.00, pool_share:  57.00, affiliates: { code: MOCK_CODE   } },
  { id: 'm6',  affiliate_id: MOCK_AFFILIATE_ID, date: '2026-04-28', rank: 1, profit_generated: 440.00, pool_share: 112.00, affiliates: { code: MOCK_CODE   } },
  // ── Competitors — prior days ──
  { id: 'm10', affiliate_id: 'aff-shadow',    date: '2026-05-14', rank: 2, profit_generated: 310.00, pool_share:  79.00, affiliates: { code: 'SHADOW99'  } },
  { id: 'm11', affiliate_id: 'aff-darkroom',  date: '2026-05-14', rank: 3, profit_generated: 240.00, pool_share:  61.00, affiliates: { code: 'DARKROOM'  } },
  { id: 'm12', affiliate_id: 'aff-lensflare', date: '2026-05-14', rank: 4, profit_generated: 185.00, pool_share:  47.00, affiliates: { code: 'LENSFLARE' } },
  { id: 'm13', affiliate_id: 'aff-grainwave', date: '2026-05-14', rank: 5, profit_generated: 120.00, pool_share:  30.50, affiliates: { code: 'GRAINWAVE' } },
  { id: 'm14', affiliate_id: 'aff-shadow',    date: '2026-05-13', rank: 1, profit_generated: 350.00, pool_share:  89.00, affiliates: { code: 'SHADOW99'  } },
  { id: 'm15', affiliate_id: 'aff-darkroom',  date: '2026-05-13', rank: 3, profit_generated: 175.00, pool_share:  44.00, affiliates: { code: 'DARKROOM'  } },
  { id: 'm16', affiliate_id: 'aff-shadow',    date: '2026-05-10', rank: 2, profit_generated: 290.00, pool_share:  73.00, affiliates: { code: 'SHADOW99'  } },
  { id: 'm17', affiliate_id: 'aff-darkroom',  date: '2026-05-10', rank: 3, profit_generated: 210.00, pool_share:  53.00, affiliates: { code: 'DARKROOM'  } },
  { id: 'm18', affiliate_id: 'aff-shadow',    date: '2026-05-07', rank: 1, profit_generated: 390.00, pool_share:  99.00, affiliates: { code: 'SHADOW99'  } },
  { id: 'm19', affiliate_id: 'aff-darkroom',  date: '2026-05-07', rank: 2, profit_generated: 220.00, pool_share:  56.00, affiliates: { code: 'DARKROOM'  } },
  { id: 'm20', affiliate_id: 'aff-lensflare', date: '2026-04-28', rank: 2, profit_generated: 310.00, pool_share:  78.00, affiliates: { code: 'LENSFLARE' } },
  { id: 'm21', affiliate_id: 'aff-darkroom',  date: '2026-04-28', rank: 3, profit_generated: 185.00, pool_share:  47.00, affiliates: { code: 'DARKROOM'  } },
]

const SUPABASE_TABLE_MOCKS: Record<string, unknown> = {
  'affiliates':              [MOCK_AFFILIATE_ROW],
  'affiliate_commissions':   MOCK_COMMISSIONS,
  'affiliate_click_events':  MOCK_CLICKS,
  'king_midas_daily_stats':  MOCK_MIDAS_STATS,
  'photo_libraries': [
    { id: '6d78991a-f350-4221-9fb1-ede0e8a1c552', name: 'LAST NIGHT',      slug: 'last-night',      is_private: false, cover_image_url: 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/gallery-photos/covers/1768620596006_DSCF1391.JPG',  price: 20.00, created_at: '2026-01-17T03:30:11Z' },
    { id: '54cdcf08-9857-4819-9d2b-9702e14815f7', name: 'LAST NIGHT NOIR', slug: 'last-night-noir', is_private: false, cover_image_url: 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/gallery-photos/covers/1770068827552_DSCF1621.jpeg', price: 10.00, created_at: '2026-02-01T04:35:26Z' },
  ],
  'photo_orders':            [],
  'blog_posts':              [],
  'user_subdomains':         [],
}

// ─── Supabase client patch ────────────────────────────────────────────────────
// supabase-js captures the native `fetch` at module init time (before our
// window.fetch interceptor is installed), so REST calls bypass the interceptor.
// Patch supabase.from() directly to return mock data without any network call.

function makeQueryBuilder(initialRows: unknown[]): any {
  let filtered = [...initialRows] as any[]
  const terminal = (single: boolean) =>
    Promise.resolve({ data: single ? (filtered[0] ?? null) : filtered, error: null })
  const chain = (): any => ({
    select:        ()                          => chain(),
    eq:            (col: string, val: any)     => { filtered = filtered.filter((r: any) => String(r[col]) === String(val)); return chain() },
    neq:           (col: string, val: any)     => { filtered = filtered.filter((r: any) => String(r[col]) !== String(val)); return chain() },
    gte:           (col: string, val: any)     => { filtered = filtered.filter((r: any) => r[col] >= val); return chain() },
    lte:           (col: string, val: any)     => { filtered = filtered.filter((r: any) => r[col] <= val); return chain() },
    gt:            (col: string, val: any)     => { filtered = filtered.filter((r: any) => r[col] > val);  return chain() },
    lt:            (col: string, val: any)     => { filtered = filtered.filter((r: any) => r[col] < val);  return chain() },
    in:            (col: string, vals: any[])  => { filtered = filtered.filter((r: any) => vals.includes(r[col])); return chain() },
    order:         (col: string, opts?: { ascending?: boolean }) => {
      const asc = opts?.ascending !== false
      filtered = [...filtered].sort((a: any, b: any) => asc ? (a[col] < b[col] ? -1 : 1) : (a[col] > b[col] ? -1 : 1))
      return chain()
    },
    limit:         (n: number)                 => { filtered = filtered.slice(0, n); return chain() },
    range:         (from: number, to: number)  => { filtered = filtered.slice(from, to + 1); return chain() },
    or:            ()                          => chain(),
    filter:        ()                          => chain(),
    match:         ()                          => chain(),
    is:            ()                          => chain(),
    not:           ()                          => chain(),
    contains:      ()                          => chain(),
    containedBy:   ()                          => chain(),
    overlaps:      ()                          => chain(),
    textSearch:    ()                          => chain(),
    ilike:         ()                          => chain(),
    like:          ()                          => chain(),
    single:        ()                          => terminal(true),
    maybeSingle:   ()                          => terminal(true),
    then:          (res: (v: any) => any, rej?: (e: any) => any) => terminal(false).then(res, rej),
  })
  return chain()
}

;(supabase as any).from = (table: string) => {
  const rows = (SUPABASE_TABLE_MOCKS[table] as unknown[]) ?? []
  return makeQueryBuilder(rows)
}

// RPC calls return null data (no real DB to query)
;(supabase as any).rpc = (_fn: string, _params?: object) =>
  Promise.resolve({ data: null, error: null })

// Install fetch mock for /api/* calls (supabase REST is handled above)
const _originalFetch = window.fetch

function ok(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))
}

function previewFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input
    : input instanceof URL ? input.href
    : (input as Request).url

  // Affiliate API calls
  if (url.includes('/api/affiliates/') || url.includes('/api/king-midas')) {
    for (const [key, data] of Object.entries(AFFILIATE_API_MOCKS)) {
      if (url.includes(key)) return ok(data)
    }
  }

  // supabase.co calls are handled via the supabase.from() patch above,
  // so any remaining supabase network calls (auth, storage, etc.) are silenced.
  if (url.includes('supabase.co/')) {
    return ok({ data: null, error: null })
  }

  return _originalFetch(input, init)
}

// Install before first render
window.fetch = previewFetch

// ─── Mock auth ───────────────────────────────────────────────────────────────

const MOCK_AUTH = {
  user: {
    id: MOCK_USER_ID,
    email: 'thelostandunfounds@gmail.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: { author_name: 'Preview User' },
    aud: 'authenticated',
    role: 'authenticated',
  } as any,
  session: null,
  tier: 'free' as const,
  loading: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  refreshAuth: async () => {},
  clearAuthStorage: async () => {},
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PreviewAffiliate() {
  useLayoutEffect(() => {
    window.fetch = previewFetch
    return () => { window.fetch = _originalFetch }
  }, [])

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-0 left-0 right-0 z-[9999] h-6 bg-white/5 flex items-center justify-center pointer-events-none">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Preview Mode — Affiliate Dashboard</p>
      </div>
      <div className="pt-6">
        <AuthContext.Provider value={MOCK_AUTH}>
          <Affiliate />
        </AuthContext.Provider>
      </div>
      <Footer />
    </div>
  )
}
