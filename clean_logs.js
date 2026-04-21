import db from './server/config/db.js';
(async () => {
  try {
    await db.query("DELETE FROM admin_logs WHERE action IN ('SAVE_DRAFT', 'PUBLISH_SECTION')");
    console.log("DB Cleaned");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
