import pool from './config/db.js';
const r = await pool.query('SELECT id, published_data, draft_data FROM site_nodes ORDER BY id');
for (const row of r.rows) {
  console.log('\n━━━ NODE:', row.id);
  const d = row.published_data || row.draft_data || {};
  const keys = Object.keys(d);
  console.log('Keys:', keys.slice(0, 15).join(', '));
  if (d.elements) {
    console.log('Elements:', d.elements.length, '| Keys[0]:', d.elements[0] ? Object.keys(d.elements[0]).join(', ') : 'NONE');
  }
  if (d.planFeaturesExtended) {
    console.log('Features:', d.planFeaturesExtended.length, '| Keys[0]:', d.planFeaturesExtended[0] ? Object.keys(d.planFeaturesExtended[0]).join(', ') : 'NONE');
  }
}
await pool.end();
