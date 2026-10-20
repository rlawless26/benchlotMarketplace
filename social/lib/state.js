/**
 * Batch and post persistence (migration/schema/013_social.sql).
 */
const { sql } = require('./db');

async function getBatch(name) {
  const rows = await sql(`SELECT * FROM social_batches WHERE name = $1`, [name]);
  return rows[0] ?? null;
}

async function listBatches() {
  return sql(
    `SELECT b.*, count(p.id)::int AS posts,
            count(p.id) FILTER (WHERE p.status = 'published')::int AS published,
            count(p.id) FILTER (WHERE p.status = 'failed')::int AS failed
     FROM social_batches b LEFT JOIN social_posts p ON p.batch_id = b.id
     GROUP BY b.id ORDER BY b.window_start DESC`
  );
}

async function createBatch(name, windowStart, windowDays) {
  const rows = await sql(
    `INSERT INTO social_batches (name, window_start, window_days) VALUES ($1, $2, $3) RETURNING *`,
    [name, windowStart, windowDays]
  );
  return rows[0];
}

/** Deletes a batch and its posts. Refuses anything but a pending batch. */
async function deleteBatch(name) {
  const b = await getBatch(name);
  if (!b) return false;
  if (b.status !== 'pending') throw new Error(`Batch ${name} is ${b.status}; only a pending batch can be regenerated`);
  await sql(`DELETE FROM social_batches WHERE id = $1`, [b.id]);
  return true;
}

async function setBatchStatus(name, status) {
  const rows = await sql(
    `UPDATE social_batches SET status = $2, approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE approved_at END
     WHERE name = $1 RETURNING *`,
    [name, status]
  );
  if (!rows[0]) throw new Error(`No batch named ${name}`);
  return rows[0];
}

async function insertPost(batchId, post) {
  const payload = {
    label: post.label,
    cards: post.cards,
    guide_path: post.guide_path ?? null,
    source_url: post.source_url ?? null,
    notes: post.notes ?? [],
  };
  const rows = await sql(
    `INSERT INTO social_posts (batch_id, post_type, scheduled_for, subject_key, subject_type, subject_brand,
                               caption, first_comment, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb) RETURNING id`,
    [batchId, post.post_type, post.scheduled_for, post.subject_key, post.subject_type ?? null, post.subject_brand ?? null,
     post.caption, post.first_comment ?? '', JSON.stringify(payload)]
  );
  return rows[0].id;
}

async function postsForBatch(name) {
  return sql(
    `SELECT p.* FROM social_posts p JOIN social_batches b ON b.id = p.batch_id
     WHERE b.name = $1 ORDER BY p.scheduled_for`,
    [name]
  );
}

async function setPostImages(id, images) {
  await sql(`UPDATE social_posts SET images = $2 WHERE id = $1`, [id, images]);
}

/**
 * (type, brand) pairs featured in any post scheduled on or after `since`,
 * lower-cased and joined with '::'. The generator refuses to feature them
 * again. Skipped posts do not count: nobody saw them.
 */
async function recentSubjects(since) {
  const rows = await sql(
    `SELECT DISTINCT lower(subject_type) AS t, lower(subject_brand) AS b
     FROM social_posts
     WHERE scheduled_for >= $1 AND status <> 'skipped' AND subject_type IS NOT NULL AND subject_brand IS NOT NULL`,
    [since]
  );
  return new Set(rows.map((r) => `${r.t}::${r.b}`));
}

const subjectPair = (type, brand) => `${String(type ?? '').toLowerCase()}::${String(brand ?? '').toLowerCase()}`;

module.exports = {
  getBatch, listBatches, createBatch, deleteBatch, setBatchStatus,
  insertPost, postsForBatch, setPostImages, recentSubjects, subjectPair,
};
