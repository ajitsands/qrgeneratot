<?php
require_once __DIR__ . '/LicenseManager.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['license_key'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'License key is required']);
    exit;
}

$licenseKey = $input['license_key'];
$domain = $input['domain_name'] ?? $_SERVER['HTTP_HOST'];
$ip = $input['ip_address'] ?? $_SERVER['REMOTE_ADDR'];

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
    $dbConfig = require __DIR__ . '/config.php';
    $licenseManager = new LicenseManager($dbConfig);
    
    $licenseManager->saveLicense($licenseKey, $data['token'], $data['public_key']);
    
    echo json_encode(['success' => true, 'message' => 'License activated successfully!']);
} else {
    http_response_code($httpCode ?: 500);
    echo json_encode(['success' => false, 'message' => $data['message'] ?? 'Activation failed']);
}
