<?php
// Global error handler to always return JSON
error_reporting(0); // Suppress default HTML output
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

if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'The vendor/autoload.php file is missing. Please make sure the vendor folder was uploaded correctly to the api folder.']);
    exit;
}

require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/LicenseManager.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRGdImagePNG;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Software-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dbConfig = require __DIR__ . '/config.php';
$auth = new Auth($dbConfig);
$licenseManager = new LicenseManager($dbConfig);

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$softwareKeyHeader = $headers['Software-Key'] ?? '';

$user = null;

if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    // Authenticate via Frontend JWT
    $jwt = $matches[1];
    $payload = $auth->verifyJWT($jwt);
    if ($payload) {
        $user = $auth->getUserById($payload['user_id']);
    }
} elseif (!empty($softwareKeyHeader)) {
    // Authenticate via API Key
    $user = $auth->getUserByLicenseKey($softwareKeyHeader);
}

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please provide a valid JWT or Software-Key header.']);
    exit;
}

if (empty($user['license_key']) || empty($user['license_token']) || empty($user['public_key'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'License verification failed: No license installed for this user.']);
    exit;
}

$licenseStatus = $licenseManager->verifyLicenseDataLocally($user['license_token'], $user['public_key']);

if (!$licenseStatus['valid']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'License verification failed: ' . $licenseStatus['message']]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['text'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Text is required to generate QR code.']);
    exit;
}

$text = $input['text'];
$format = $input['format'] ?? 'base64'; // 'base64' or 'image'
$scale = isset($input['scale']) ? (int)$input['scale'] : 5;
$quietzoneSize = isset($input['quietzoneSize']) ? (int)$input['quietzoneSize'] : 4;

$options = new QROptions();
$options->outputType = QRGdImagePNG::class;
$options->scale = max(1, min($scale, 50));
$options->quietzoneSize = max(0, min($quietzoneSize, 75));
$options->addQuietzone = ($options->quietzoneSize > 0);
$options->imageBase64 = ($format === 'base64');

if ($format === 'base64') {
    $options->imageBase64 = true;
    $qrcode = (new QRCode($options))->render($text);
    echo json_encode([
        'success' => true,
        'format' => 'base64',
        'data' => $qrcode
    ]);
} else {
    // Return image URL. We save it in a public temp folder.
    $tempDir = __DIR__ . '/public/qrcodes';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }
    
    $filename = md5($text . time()) . '.png';
    $filepath = $tempDir . '/' . $filename;
    
    (new QRCode($options))->render($text, $filepath);
    
    // Construct public URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $domainName = $_SERVER['HTTP_HOST'];
    $publicUrl = $protocol . $domainName . '/api/public/qrcodes/' . $filename;
    
    echo json_encode([
        'success' => true,
        'format' => 'image',
        'url' => $publicUrl
    ]);
}
