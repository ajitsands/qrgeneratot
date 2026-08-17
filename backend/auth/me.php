<?php
error_reporting(0);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/Auth.php';

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$jwt = $matches[1];

try {
    $dbConfig = require dirname(__DIR__) . '/config.php';
    $auth = new Auth($dbConfig);
    
    $payload = $auth->verifyJWT($jwt);
    if (!$payload) {
        throw new Exception("Invalid or expired token.");
    }

    $user = $auth->getUserById($payload['user_id']);
    if (!$user) {
        throw new Exception("User not found.");
    }

    $hasLicense = false;
    if (!empty($user['license_key']) && !empty($user['license_token']) && !empty($user['public_key'])) {
        require_once dirname(__DIR__) . '/LicenseManager.php';
        $lm = new LicenseManager();
        $status = $lm->verifyLicenseDataLocally($user['license_token'], $user['public_key']);
        $hasLicense = $status['valid'];
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'company_name' => $user['company_name'],
            'email' => $user['email'],
            'has_license' => $hasLicense,
            'license_key' => $hasLicense ? $user['license_key'] : null,
            'qr_generated_count' => (int)$user['qr_generated_count'],
            'qr_limit' => (int)$user['qr_limit'],
            'is_admin' => (bool)$user['is_admin']
        ]
    ]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
