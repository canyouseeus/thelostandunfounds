/**
 * DEFY MULTIVERSE — API.
 *
 * Routes (all under /api/defy/*):
 *   POST /enter           { email }            -> assign a universe, subscribe to PRIME
 *   GET  /state           ?token=              -> player, today's defiance, standings
 *   POST /choose          { token, choice }    -> answer today's defiance
 *   GET  /standings                            -> constellation table + top universes
 *   GET  /anchored                             -> the public register of funding universes
 *   POST /anchor-confirm  { token, sessionId } -> verify a Stripe payment, enter the register
 *
 * The day advances itself: /state claims today's question and settles overdue ones
 * via two Postgres functions. There is no cron and nothing for an operator to do.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  deriveUniverse,
  normalizeEmail,
  isPlausibleEmail,
  currentDay,
  CONSTELLATIONS,
} from '../defy/universe.js'

const PRIME_URL = 'https://www.thelostandunfounds.com'

function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Only ever expose the derived universe and public counters — never the email or token. */
function publicPlayer(row: any) {
  return {
    universe: {
      address: row.universe_address,
      name: row.universe_name,
      designation: `${row.universe_name} · ${row.universe_address}`,
      constellation: row.constellation,
      constellationKey: CONSTELLATIONS[row.constellation]?.key ?? 'UNKNOWN',
      constellationBlurb: CONSTELLATIONS[row.constellation]?.blurb ?? '',
      traits: row.traits,
      palette: row.palette,
      creed: row.creed,
    },
    score: row.score,
    streak: row.streak,
    longestStreak: row.longest_streak,
    played: row.defiances_played,
    won: row.defiances_won,
    memberSince: row.created_at,
  }
}

/** Advance the world, then hand back today's question. Safe to call concurrently. */
async function today(sb: SupabaseClient) {
  const day = currentDay()
  await sb.rpc('defy_resolve_due', { p_today: day })
  const { data, error } = await sb.rpc('defy_claim_day', { p_day: day })
  if (error) throw new Error(`Could not open today: ${error.message}`)
  return data as any
}

async function standings(sb: SupabaseClient) {
  const { data: players, error } = await sb
    .from('defy_players')
    .select('constellation, score')
  if (error) throw new Error(error.message)

  const table = CONSTELLATIONS.map((c, i) => ({
    index: i,
    key: c.key,
    hue: c.hue,
    blurb: c.blurb,
    universes: 0,
    score: 0,
  }))
  for (const p of players || []) {
    const row = table[p.constellation]
    if (!row) continue
    row.universes += 1
    row.score += p.score || 0
  }
  table.sort((a, b) => b.score - a.score || b.universes - a.universes)

  const { data: top } = await sb
    .from('defy_players')
    .select('universe_name, universe_address, constellation, score, streak')
    .order('score', { ascending: false })
    .limit(12)

  return {
    constellations: table,
    topUniverses: (top || []).map(t => ({
      designation: `${t.universe_name} · ${t.universe_address}`,
      constellationKey: CONSTELLATIONS[t.constellation]?.key ?? '—',
      score: t.score,
      streak: t.streak,
    })),
    totalUniverses: (players || []).length,
  }
}

/* ------------------------------------------------------------------ routes */

async function enter(req: VercelRequest, res: VercelResponse) {
  const sb = db()
  const rawEmail = String((req.body?.email ?? '')).trim()

  if (!isPlausibleEmail(rawEmail)) {
    return res.status(400).json({ error: 'That address will not resolve. Check it and try again.' })
  }

  const email = normalizeEmail(rawEmail)
  const u = deriveUniverse(email)

  // Returning traveller: the universe is derived, so it is already the same one.
  const { data: existing } = await sb
    .from('defy_players')
    .select('*')
    .eq('email_normalized', email)
    .maybeSingle()

  let row = existing
  if (row) {
    await sb.from('defy_players').update({ last_seen_at: new Date().toISOString() }).eq('id', row.id)
  } else {
    const { data: created, error } = await sb
      .from('defy_players')
      .insert({
        email: rawEmail,
        email_normalized: email,
        universe_address: u.address,
        universe_name: u.name,
        constellation: u.constellation,
        traits: u.traits,
        palette: u.palette,
        creed: u.creed,
      })
      .select('*')
      .single()

    if (error) {
      // Lost a race against a simultaneous first entry — read theirs back.
      const { data: raced } = await sb
        .from('defy_players').select('*').eq('email_normalized', email).maybeSingle()
      if (!raced) throw new Error(`Could not open a universe: ${error.message}`)
      row = raced
    } else {
      row = created
    }
  }

  // The crossing to UNIVERSE PRIME. Entering DEFY subscribes you there.
  // Never let a newsletter failure block entry — the game is the promise, not the list.
  let crossedToPrime = false
  try {
    const { data: sub } = await sb
      .from('newsletter_subscribers')
      .select('id').eq('email', email).maybeSingle()
    if (!sub) {
      const { error: subErr } = await sb
        .from('newsletter_subscribers')
        .insert({ email, source: 'defy_multiverse' })
      crossedToPrime = !subErr
    }
  } catch (e) {
    console.error('[defy] PRIME crossing failed (entry still granted):', e)
  }

  return res.status(200).json({
    token: row.token,
    returning: Boolean(existing),
    crossedToPrime,
    ...publicPlayer(row),
    primeUrl: PRIME_URL,
  })
}

async function playerByToken(sb: SupabaseClient, token: unknown) {
  const t = String(token || '')
  if (!/^[0-9a-f-]{36}$/i.test(t)) return null
  const { data } = await sb.from('defy_players').select('*').eq('token', t).maybeSingle()
  return data
}

async function state(req: VercelRequest, res: VercelResponse) {
  const sb = db()
  const d = await today(sb)
  const row = await playerByToken(sb, req.query.token)

  let yourChoice: string | null = null
  if (row && d) {
    const { data: c } = await sb
      .from('defy_choices')
      .select('choice').eq('player_id', row.id).eq('defiance_id', d.id).maybeSingle()
    yourChoice = c?.choice ?? null
  }

  // The live split is deliberately hidden until you have answered — seeing it first
  // would collapse a minority game into a coordination game.
  const { data: lastResolved } = await sb
    .from('defy_defiances')
    .select('prompt, option_a, option_b, count_a, count_b, minority, day')
    .eq('resolved', true).not('minority', 'is', null)
    .order('day', { ascending: false }).limit(1).maybeSingle()

  return res.status(200).json({
    day: currentDay(),
    defiance: d ? { id: d.id, prompt: d.prompt, optionA: d.option_a, optionB: d.option_b } : null,
    yourChoice,
    player: row ? publicPlayer(row) : null,
    lastResolved: lastResolved || null,
    standings: await standings(sb),
    primeUrl: PRIME_URL,
  })
}

async function choose(req: VercelRequest, res: VercelResponse) {
  const sb = db()
  const choice = String(req.body?.choice || '').toLowerCase()
  if (choice !== 'a' && choice !== 'b') {
    return res.status(400).json({ error: 'Choose a or b.' })
  }

  const row = await playerByToken(sb, req.body?.token)
  if (!row) return res.status(401).json({ error: 'No universe on this token. Enter again.' })

  const d = await today(sb)
  if (!d) return res.status(503).json({ error: 'Today has not opened yet.' })

  const { data: already } = await sb
    .from('defy_choices')
    .select('choice').eq('player_id', row.id).eq('defiance_id', d.id).maybeSingle()

  if (already) {
    return res.status(200).json({ choice: already.choice, alreadyAnswered: true, ...publicPlayer(row) })
  }

  const { error: insErr } = await sb
    .from('defy_choices')
    .insert({ player_id: row.id, defiance_id: d.id, choice })
  if (insErr) {
    const { data: raced } = await sb
      .from('defy_choices').select('choice')
      .eq('player_id', row.id).eq('defiance_id', d.id).maybeSingle()
    if (raced) return res.status(200).json({ choice: raced.choice, alreadyAnswered: true, ...publicPlayer(row) })
    throw new Error(insErr.message)
  }

  // Participation streak: consecutive days answered.
  const day = currentDay()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const streak = row.last_played_day === yesterday ? (row.streak || 0) + 1
              : row.last_played_day === day       ? (row.streak || 0)
              : 1

  const { data: updated } = await sb
    .from('defy_players')
    .update({
      last_played_day: day,
      streak,
      longest_streak: Math.max(streak, row.longest_streak || 0),
      defiances_played: (row.defiances_played || 0) + 1,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', row.id).select('*').single()

  return res.status(200).json({ choice, alreadyAnswered: false, ...publicPlayer(updated || row) })
}

async function anchored(_req: VercelRequest, res: VercelResponse) {
  const sb = db()
  const { data } = await sb
    .from('defy_anchors')
    .select('designation, amount_cents, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  const total = (data || []).reduce((s, a: any) => s + (a.amount_cents || 0), 0)
  return res.status(200).json({
    anchors: (data || []).map((a: any) => ({ designation: a.designation, at: a.created_at })),
    count: (data || []).length,
    totalUsd: Math.round(total / 100),
    primeUrl: PRIME_URL,
  })
}

/**
 * Confirm an anchor. Stripe is the source of truth: the register only records a
 * session Stripe itself reports as paid, so a forged sessionId buys nothing.
 */
async function anchorConfirm(req: VercelRequest, res: VercelResponse) {
  const sb = db()
  const sessionId = String(req.body?.sessionId || '')
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Not a checkout session.' })
  }

  const row = await playerByToken(sb, req.body?.token)
  if (!row) return res.status(401).json({ error: 'No universe on this token.' })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return res.status(503).json({ error: 'Payments are not configured.' })

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  if (!r.ok) return res.status(400).json({ error: 'Stripe does not recognise that session.' })

  const session: any = await r.json()
  if (session.payment_status !== 'paid') {
    return res.status(402).json({ error: 'That session has not been paid.' })
  }

  const designation = `${row.universe_name} · ${row.universe_address}`
  const { error } = await sb.from('defy_anchors').insert({
    player_id: row.id,
    stripe_session_id: sessionId,
    amount_cents: session.amount_total || 0,
    currency: session.currency || 'usd',
    designation,
  })
  // A duplicate just means they reloaded the return page. Still anchored.
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message)

  return res.status(200).json({ anchored: true, designation })
}

/**
 * The public ledger. Every settled day, hash-chained. Anyone can recompute the chain
 * from this response alone and catch a tampered result — which is the point of
 * publishing vote counts for a game about not trusting vote counts.
 */
async function ledger(req: VercelRequest, res: VercelResponse) {
  const sb = db()
  const { data, error } = await sb
    .from('defy_ledger')
    .select('seq, day, prompt, option_a, option_b, count_a, count_b, minority, award, prev_hash, entry_hash')
    .order('seq', { ascending: true })
    .limit(5000)
  if (error) throw new Error(error.message)

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).json({
    algorithm: 'sha256',
    genesis: '0'.repeat(64),
    preimage: "prev_hash|day|prompt|option_a|option_b|count_a|count_b|minority (or '-')|award",
    note: 'entry_hash = sha256(preimage). Each entry commits to the one before it. Recompute in order; any divergence means the chain was altered.',
    length: (data || []).length,
    entries: data || [],
  })
}

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
  const header = req.headers['x-admin-email']
  const email = String(Array.isArray(header) ? header[0] : header || '').toLowerCase().trim()
  return ADMIN_EMAILS.includes(email)
}

/** Operator view. Everything is a live count — nothing here is a placeholder. */
async function admin(req: VercelRequest, res: VercelResponse) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' })
  const sb = db()
  const day = currentDay()

  const count = async (table: string, apply?: (q: any) => any) => {
    let q = sb.from(table).select('*', { count: 'exact', head: true })
    if (apply) q = apply(q)
    const { count: c, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    return c || 0
  }

  const since = (days: number) =>
    new Date(Date.now() - days * 86400000).toISOString()

  const [universes, newToday, new7d, poolLeft, poolTotal, ledgerLen, anchorRows, todayRow, players] =
    await Promise.all([
      count('defy_players'),
      count('defy_players', q => q.gte('created_at', `${day}T00:00:00Z`)),
      count('defy_players', q => q.gte('created_at', since(7))),
      count('defy_defiances', q => q.is('day', null)),
      count('defy_defiances'),
      count('defy_ledger'),
      sb.from('defy_anchors').select('amount_cents, created_at, designation').order('created_at', { ascending: false }).limit(50),
      sb.from('defy_defiances').select('id, prompt, option_a, option_b').eq('day', day).maybeSingle(),
      sb.from('defy_players').select('constellation, score, streak, last_played_day, defiances_played'),
    ])

  let answeredToday = 0
  if (todayRow.data?.id) {
    answeredToday = await count('defy_choices', q => q.eq('defiance_id', todayRow.data!.id))
  }

  // Newsletter rows this crossing actually produced — the number that matters most.
  const crossings = await count('newsletter_subscribers', q => q.eq('source', 'defy_multiverse'))
  const subscribersTotal = await count('newsletter_subscribers')

  const anchors = anchorRows.data || []
  const anchorCents = anchors.reduce((s: number, a: any) => s + (a.amount_cents || 0), 0)
  const anchors30d = anchors.filter((a: any) => a.created_at >= since(30))
  const anchorCents30d = anchors30d.reduce((s: number, a: any) => s + (a.amount_cents || 0), 0)

  const rows = players.data || []
  const active7d = rows.filter((p: any) => p.last_played_day && p.last_played_day >= since(7).slice(0, 10)).length
  const everPlayed = rows.filter((p: any) => (p.defiances_played || 0) > 0).length

  const byConstellation = CONSTELLATIONS.map((c, i) => ({
    key: c.key,
    universes: rows.filter((p: any) => p.constellation === i).length,
    score: rows.filter((p: any) => p.constellation === i).reduce((s: number, p: any) => s + (p.score || 0), 0),
  })).sort((a, b) => b.score - a.score)

  const { data: recentLedger } = await sb
    .from('defy_ledger').select('day, count_a, count_b, minority, award, entry_hash')
    .order('seq', { ascending: false }).limit(14)

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    day,
    funnel: {
      universes, newToday, new7d,
      everPlayed, active7d,
      answeredToday,
      activationPct: universes ? Math.round((everPlayed / universes) * 100) : 0,
    },
    prime: { crossings, subscribersTotal },
    money: {
      anchorCount: anchors.length,
      anchorUsd: Math.round(anchorCents / 100),
      anchorUsd30d: Math.round(anchorCents30d / 100),
      dailyAverage30d: Math.round(anchorCents30d / 100 / 30),
      goalPerDay: 150,
    },
    content: { poolLeft, poolTotal, daysOfRunway: poolLeft },
    ledger: { length: ledgerLen, recent: recentLedger || [] },
    today: todayRow.data || null,
    byConstellation,
    recentAnchors: anchors.slice(0, 10).map((a: any) => ({
      designation: a.designation, usd: Math.round((a.amount_cents || 0) / 100), at: a.created_at,
    })),
  })
}

/* ----------------------------------------------------------------- router */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let route = ''
  if (req.query.path) {
    route = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path
  } else {
    const parts = (req.url?.split('?')[0] || '').split('/').filter(Boolean)
    route = parts[parts.length - 1] || ''
  }

  try {
    switch (route) {
      case 'enter':          return req.method === 'POST' ? await enter(req, res)        : res.status(405).json({ error: 'POST only' })
      case 'state':          return await state(req, res)
      case 'choose':         return req.method === 'POST' ? await choose(req, res)       : res.status(405).json({ error: 'POST only' })
      case 'standings':      return res.status(200).json(await standings(db()))
      case 'anchored':       return await anchored(req, res)
      case 'anchor-confirm': return req.method === 'POST' ? await anchorConfirm(req, res) : res.status(405).json({ error: 'POST only' })
      case 'ledger':         return await ledger(req, res)
      case 'admin':          return await admin(req, res)
      default:               return res.status(404).json({ error: `No such crossing: ${route}` })
    }
  } catch (err: any) {
    console.error('[defy] route error:', route, err)
    return res.status(500).json({ error: err?.message || 'The multiverse is unreachable.' })
  }
}
