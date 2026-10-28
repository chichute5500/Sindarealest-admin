<?php
/**
 * Owner-controlled Zalo profile relay for Vietnam-based PHP shared hosting.
 * Install as public_html/zalo-me.php with .htaccess rewrite /v1/zalo/me.
 * Create private secret file at dirname(public_html)/sd_zalo_relay_private/secret.txt.
 * Never expose this file, Zalo access tokens, or HMAC values in logs/URLs.
 */
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
function answer(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' ||
    parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) !== '/v1/zalo/me' ||
    !str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
    answer(404, ['error' => 'not_found']);
}
// PHP must be reached via an HTTPS-enabled, DNS-only origin.
if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
    answer(403, ['error' => 'https_required']);
}
$secretDir = dirname(__DIR__) . '/sd_zalo_relay_private';
$secretPath = $secretDir . '/secret.txt';
if (!is_dir($secretDir) || !is_readable($secretPath)) {
    answer(503, ['error' => 'unconfigured']);
}
$secret = trim((string) file_get_contents($secretPath));
if (strlen($secret) < 32) answer(503, ['error' => 'unconfigured']);
$length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length < 1 || $length > 8192) answer(413, ['error' => 'body_too_large']);
$raw = file_get_contents('php://input', false, null, 0, 8193);
if (!is_string($raw) || strlen($raw) !== $length || strlen($raw) > 8192)
    answer(400, ['error' => 'bad_request']);
$t = $_SERVER['HTTP_X_SD_TIME'] ?? '';
$n = $_SERVER['HTTP_X_SD_NONCE'] ?? '';
$sig = $_SERVER['HTTP_X_SD_SIGNATURE'] ?? '';
if (!is_string($t) || !preg_match('/^[0-9]{10,11}$/D', $t) ||
    abs(time() - (int) $t) > 60 ||
    !is_string($n) || !preg_match('/^[0-9a-f-]{36}$/Di', $n) ||
    !is_string($sig) || !preg_match('/^[0-9a-f]{64}$/Di', $sig))
    answer(403, ['error' => 'unauthorized']);
$expected = hash_hmac('sha256', $t . '.' . $n . '.' . $raw, $secret);
if (!hash_equals($expected, strtolower($sig))) answer(403, ['error' => 'unauthorized']);
// Persist one-time nonces outside DocumentRoot. Atomic exclusive file lock
// prevents replay even with concurrent PHP requests on shared hosting.
$lock = @fopen($secretDir . '/nonces.json', 'c+');
if (!$lock || !flock($lock, LOCK_EX)) answer(503, ['error' => 'nonce_store']);
$current = stream_get_contents($lock);
$seen = json_decode($current ?: '{}', true);
if (!is_array($seen)) $seen = [];
$now = time();
foreach ($seen as $key => $expiry) {
    if (!is_int($expiry) || $expiry < $now) unset($seen[$key]);
}
if (isset($seen[$n]) || count($seen) > 5000) {
    flock($lock, LOCK_UN); fclose($lock);
    answer(403, ['error' => 'replay']);
}
$seen[$n] = $now + 120;
$written = json_encode($seen);
rewind($lock); ftruncate($lock, 0);
$ok = is_string($written) && fwrite($lock, $written) === strlen($written);
fflush($lock); flock($lock, LOCK_UN); fclose($lock);
if (!$ok) answer(503, ['error' => 'nonce_store']);
try { $data = json_decode($raw, true, 8, JSON_THROW_ON_ERROR); }
catch (Throwable $e) { answer(400, ['error' => 'bad_json']); }
$token = is_array($data) ? ($data['access_token'] ?? null) : null;
$proof = is_array($data) ? ($data['appsecret_proof'] ?? null) : null;
if (!is_string($token) || strlen($token) < 1 || strlen($token) > 4096 ||
    !is_string($proof) || !preg_match('/^[a-f0-9]{64}$/D', $proof))
    answer(400, ['error' => 'bad_request']);
if (!function_exists('curl_init')) answer(503, ['error' => 'curl_unavailable']);
// HTTPS egress occurs on the Vietnam-based shared-host machine.
$ch = curl_init('https://graph.zalo.me/v2.0/me?fields=id%2Cname');
curl_setopt_array($ch, [
    CURLOPT_HTTPGET => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 9,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_HTTPHEADER => ['access_token: ' . $token, 'appsecret_proof: ' . $proof]
]);
$response = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if (!is_string($response) || strlen($response) > 32768 || $status !== 200)
    answer(502, ['error' => 'upstream_unavailable']);
try { $profile = json_decode($response, true, 8, JSON_THROW_ON_ERROR); }
catch (Throwable $e) { answer(502, ['error' => 'upstream_invalid']); }
if (!is_array($profile)) answer(502, ['error' => 'upstream_invalid']);
$error = $profile['error'] ?? 0;
if ((string) $error !== '0') {
    $number = filter_var($error, FILTER_VALIDATE_INT);
    answer(200, ['error' => $number !== false && abs($number) < 100000 ? $number : 'upstream_api_error']);
}
$id = $profile['id'] ?? null;
$subject = is_string($id) ? $id : (is_int($id) ? (string) $id : '');
if (!preg_match('/^[A-Za-z0-9:_-]{1,255}$/D', $subject))
    answer(502, ['error' => 'upstream_invalid']);
$name = is_string($profile['name'] ?? null) ? mb_substr($profile['name'], 0, 100) : 'Khách hàng';
answer(200, ['error' => 0, 'id' => $subject, 'name' => $name]);
