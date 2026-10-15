const REQUIRED_AI_REVIEW_COLUMNS = [
  "id",
  "product_id",
  "image_ref",
  "image_kind",
  "status",
  "analysis_json",
  "source_url",
  "source_image_url",
  "reference_image_ref",
  "r2_key"
];

/**
 * Read-only preflight for every AI image workflow that can spend quota or
 * write candidates. Never assumes a failed D1 query means the schema is ready.
 */
export async function inspectAiReviewSchema(db) {
  let reviewSchemaInspectable = false;
  let missingReviewColumns = [...REQUIRED_AI_REVIEW_COLUMNS];

  if (db) {
    try {
      const schema = await db.prepare("PRAGMA table_info(image_ai_reviews)").all();
      if (Array.isArray(schema?.results)) {
        reviewSchemaInspectable = true;
        const columns = schema.results.map(column => String(column?.name || ""));
        missingReviewColumns = REQUIRED_AI_REVIEW_COLUMNS.filter(column => !columns.includes(column));
      }
    } catch {
      // Keep reviewSchemaInspectable=false so callers fail closed.
    }
  }

  let quotaTableConfigured = false;
  if (db) {
    try {
      await db.prepare("SELECT scope FROM ai_request_limits LIMIT 1").first();
      quotaTableConfigured = true;
    } catch {
      // No quota table means no paid/model action is safe.
    }
  }

  return {
    reviewSchemaInspectable,
    reviewSchemaConfigured: reviewSchemaInspectable && missingReviewColumns.length === 0,
    missingReviewColumns,
    quotaTableConfigured
  };
}
