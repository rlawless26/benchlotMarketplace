/**
 * Batch assembly: slots × rotation → posts, with the repeat guard.
 *
 * Deterministic for a given database state: candidates come back in a fixed
 * order and are taken in that order, so running `generate` twice for the same
 * window produces the same batch. Re-running replaces a pending batch (with
 * --force); an approved batch is never touched.
 */
const config = require('../config');
const state = require('./state');
const { slotsFrom, localDateString } = require('./schedule');
const { types, byType } = require('../posts');

async function generate({ start, days = config.schedule.defaultDays, name, force = false, now = new Date(), log = console.log }) {
  const batchName = name ?? localDateString(start);
  const existing = await state.getBatch(batchName);
  if (existing) {
    if (!force) throw new Error(`Batch ${batchName} already exists (${existing.status}). Re-run with --force to regenerate a pending batch.`);
    await state.deleteBatch(batchName);
    log(`Replaced pending batch ${batchName}`);
  }

  const slots = slotsFrom(start, days);
  if (!slots.length) throw new Error('No posting slots in the window');
  const guardSince = new Date(slots[0].getTime() - config.repeatGuardDays * 86_400_000);
  const used = await state.recentSubjects(guardSince);
  const usedKeys = new Set();
  const brandsInBatch = new Map(); // brand -> count, to spread makers across the batch

  // Candidate lists, fetched once per type.
  const pools = {};
  for (const t of types) {
    pools[t.type] = { list: await t.candidates(), i: 0 };
    log(`${t.label}: ${pools[t.type].list.length} candidates`);
  }

  const justListedCutoff = new Date(now.getTime() + config.justListed.scheduleWithinDays * 86_400_000);

  async function take(typeName) {
    const t = byType[typeName];
    const pool = pools[typeName];
    while (pool.i < pool.list.length) {
      const c = pool.list[pool.i++];
      const pair = state.subjectPair(c.canonical_type, c.canonical_brand);
      if (used.has(pair)) continue;
      // At most two posts per maker per batch, and never two of one maker's
      // same tool type (that is the pair guard above).
      if ((brandsInBatch.get(pair.split('::')[1]) ?? 0) >= 2) continue;
      const prepared = t.prepare ? await t.prepare(c) : c;
      if (!prepared) continue;
      const post = t.build(prepared);
      if (usedKeys.has(post.subject_key)) continue;
      used.add(pair);
      usedKeys.add(post.subject_key);
      brandsInBatch.set(pair.split('::')[1], (brandsInBatch.get(pair.split('::')[1]) ?? 0) + 1);
      return post;
    }
    return null;
  }

  const posts = [];
  const rotation = config.rotation;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    // Preferred type for this slot, then the rest of the rotation as fallbacks.
    const order = [...new Set([rotation[i % rotation.length], ...rotation])];
    let post = null;
    for (const typeName of order) {
      if (typeName === 'just-listed' && slot > justListedCutoff) continue; // stock will have turned
      post = await take(typeName);
      if (post) break;
    }
    if (!post) { log(`No candidate for slot ${slot.toISOString()}; left empty`); continue; }
    post.scheduled_for = slot;
    posts.push(post);
  }

  const batch = await state.createBatch(batchName, localDateString(slots[0]), days);
  for (const p of posts) p.id = await state.insertPost(batch.id, p);
  log(`Batch ${batchName}: ${posts.length} posts over ${slots.length} slots`);
  return { batch, posts };
}

module.exports = { generate };
