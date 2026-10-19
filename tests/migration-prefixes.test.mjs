import assert from "node:assert/strict";
import { assertUniqueMigrationPrefixes, findDuplicateMigrationPrefixes } from "../scripts/migration-prefixes.mjs";

assert.deepEqual(findDuplicateMigrationPrefixes([
  "0001_schema.sql",
  "0002_catalog.sql",
  "0011_image_similarity_index.sql",
  "0012_image_group_claims.sql",
]), []);

assert.deepEqual(findDuplicateMigrationPrefixes([
  "0001_schema.sql",
  "0011_product_source_imports.sql",
  "0011_image_similarity_index.sql",
  "0012_image_group_claims.sql",
  "README.sql",
]), [{
  prefix: "0011",
  filenames: ["0011_image_similarity_index.sql", "0011_product_source_imports.sql"],
}]);

assert.throws(() => assertUniqueMigrationPrefixes([
  "0001_schema.sql",
  "0011_product_source_imports.sql",
  "0011_image_similarity_index.sql",
]), /Duplicate D1 migration sequence prefix detected: 0011/);

assert.doesNotThrow(() => assertUniqueMigrationPrefixes([
  "0001_schema.sql",
  "0002_catalog.sql",
  "0013_product_source_imports.sql",
]));

console.log("PASS: D1 migration sequence prefixes must be unique; ZIP/AI prefix collision is detected.");
