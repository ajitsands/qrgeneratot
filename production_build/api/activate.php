<?php
error_reporting(0);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "PHP Error: $errstr in $errfile on line $errline"]);
    exit;
});
set_exception_handler(function($exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "PHP Exception: " . $exception->getMessage()]);
    exit;
});

require_once __DIR__ . '/Auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$jwt = $matches[1];
$dbConfig = require __DIR__ . '/config.php';
$auth = new Auth($dbConfig);

$payload = $auth->verifyJWT($jwt);
if (!$payload) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['license_key'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'License key is required']);
    exit;
}

$licenseKey = $input['license_key'];
$user = $auth->getUserById($payload['user_id']);
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

$domain = $user['domain_name'];
$ip = $user['domain_ip'];

$ch = curl_init('https://key.sandslab.com/public/api/activate');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'license_key' => $licenseKey,
        'domain_name' => $domain,
        'ip_address'  => trim($ip)
    ]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT => 15
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);

if ($httpCode === 200 && !empty($data['token']) && !empty($data['public_key'])) {
    $auth->saveUserLicense($payload['user_id'], $licenseKey, $data['token'], $data['public_key']);
    echo json_encode(['success' => true, 'message' => 'License activated successfully!']);
} else {
    http_response_code($httpCode ?: 500);
    echo json_encode(['success' => false, 'message' => $data['message'] ?? 'Activation failed']);
}

