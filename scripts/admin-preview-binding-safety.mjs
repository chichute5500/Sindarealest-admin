import { readFileSync } from 'node:fs';

const identity = value => typeof value === 'string' ? value.trim() : '';
const projectEnv = (project, environment) => project?.deployment_configs?.[environment] || {};
const dbBinding = (project, environment) => {
  const db = projectEnv(project, environment)?.d1_databases?.DB;
  return identity(db?.id || db?.database_id);
};
const r2Binding = (project, environment, name) => {
  const bucket = projectEnv(project, environment)?.r2_buckets?.[name];
  return identity(bucket?.name || bucket?.bucket_name);
};

/** Read-only safety check; never return IDs, bucket names or other project metadata. */
export function assessAdminPreviewBindings(adminPayload, storefrontPayload) {
  const admin = adminPayload?.result, storefront = storefrontPayload?.result;
  const blockers = [], warnings = [];
  if (adminPayload?.success !== true || admin?.name !== 'sindarealest-admin-preview' || admin?.production_branch !== 'main')
    blockers.push('ADMIN_PROJECT_IDENTITY_UNVERIFIED');
  if (storefrontPayload?.success !== true || storefront?.name !== 'sindarealest2' || storefront?.production_branch !== 'main')
    blockers.push('STOREFRONT_PROJECT_IDENTITY_UNVERIFIED');

  const adminPreviewDb = dbBinding(admin, 'preview');
  const adminPreviewImages = r2Binding(admin, 'preview', 'IMAGES');
  const adminPreviewOriginals = r2Binding(admin, 'preview', 'ORIGINALS');
  const storefrontProductionDb = dbBinding(storefront, 'production');
  const storefrontProductionImages = r2Binding(storefront, 'production', 'IMAGES');
  const storefrontProductionOriginals = r2Binding(storefront, 'production', 'ORIGINALS');

  if (!adminPreviewDb || !adminPreviewImages || !storefrontProductionDb ||
      !storefrontProductionImages || !storefrontProductionOriginals)
    blockers.push('MANDATORY_BINDING_IDENTITY_MISSING');
  // A comparison is not safe when either side is absent.
  if (adminPreviewDb && storefrontProductionDb && adminPreviewDb === storefrontProductionDb)
    blockers.push('ADMIN_PREVIEW_D1_IS_PRODUCTION');
  if (adminPreviewImages && [storefrontProductionImages, storefrontProductionOriginals].includes(adminPreviewImages))
    blockers.push('ADMIN_PREVIEW_IMAGES_IS_PRODUCTION');
  if (!adminPreviewOriginals) {
    // Absence keeps product and warranty uploads unavailable, but it is safe
    // to deploy UI fixes: the upload routes independently fail closed on no binding.
    warnings.push('ADMIN_PREVIEW_ORIGINALS_UNBOUND_UPLOADS_DISABLED');
  } else {
    if ([storefrontProductionImages, storefrontProductionOriginals].includes(adminPreviewOriginals))
      blockers.push('ADMIN_PREVIEW_ORIGINALS_IS_PRODUCTION');
    if (adminPreviewImages && adminPreviewOriginals === adminPreviewImages)
      blockers.push('ADMIN_PREVIEW_ORIGINALS_IS_PUBLIC_IMAGES');
  }
  if (!blockers.length) warnings.push('BINDING_NAMES_ARE_NOT_PROOF_OF_R2_BUCKET_PRIVACY');
  return { deployAllowed: blockers.length === 0, privateUploadsBindingSeparated: Boolean(adminPreviewOriginals) && blockers.length === 0,
    blockers, warnings };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  if (process.argv.length !== 4) throw Error('Expect two temporary Cloudflare project metadata JSON paths.');
  const report = assessAdminPreviewBindings(
    JSON.parse(readFileSync(process.argv[2], 'utf8')),
    JSON.parse(readFileSync(process.argv[3], 'utf8'))
  );
  for (const code of report.blockers) console.log('::error::' + code);
  for (const code of report.warnings) console.log('::warning::' + code);
  if (!report.deployAllowed) {
    console.log('::error::ADMIN_PREVIEW_DEPLOY_BLOCKED_BY_BINDING_SAFETY');
    process.exitCode = 1;
  } else {
    console.log('PASS: Admin Preview deploy binding IDs are isolated from Production; no storage writes or config changes performed.');
  }
}
