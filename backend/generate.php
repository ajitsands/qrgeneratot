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

require_once __DIR__ . '/vendor/autoload.php';

require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/LicenseManager.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\Data\QRMatrix;

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

$isWebAccess = false;
$isApiAccess = false;

if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    // Authenticate via Frontend JWT
    $jwt = $matches[1];
    $payload = $auth->verifyJWT($jwt);
    if ($payload) {
        $user = $auth->getUserById($payload['user_id']);
        $isWebAccess = true;
    }
} elseif (!empty($softwareKeyHeader)) {
    // Authenticate via API Key
    $user = $auth->getUserByLicenseKey($softwareKeyHeader);
    $isApiAccess = true;
}

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please provide a valid JWT or Software-Key header.']);
    exit;
}

if ($isApiAccess) {
    if (empty($user['license_key']) || empty($user['license_token']) || empty($user['public_key'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'License verification failed: No valid license installed for API access.']);
        exit;
    }

    $licenseStatus = $licenseManager->verifyLicenseDataLocally($user['license_token'], $user['public_key']);

    if (!$licenseStatus['valid']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'License verification failed: ' . $licenseStatus['message']]);
        exit;
    }

    // Strictly check if the caller IP matches the user's registered IP or domain IP
    $callerIp = $_SERVER['REMOTE_ADDR'];
    $registeredIp = $user['domain_ip'];
    $registeredDomain = $user['domain_name'];
    $resolvedIp = gethostbyname($registeredDomain);

    if ($callerIp !== $registeredIp && $callerIp !== $resolvedIp) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => "API call unauthorized. Request came from IP: $callerIp, but license is registered to IP: $registeredIp and Domain: $registeredDomain (Resolved: $resolvedIp)."]);
        exit;
    }
}

$input = json_decode(file_get_contents('php://input'), true);

$isBulk = false;
$textsArray = [];

if (isset($input['texts']) && is_array($input['texts'])) {
    $isBulk = true;
    $textsArray = $input['texts'];
} elseif (isset($input['text'])) {
    $textsArray = [$input['text']];
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Either "text" (string) or "texts" (array) is required.']);
    exit;
}

if (empty($textsArray)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No text provided.']);
    exit;
}

// Check limits
$limit = (int)$user['qr_limit'];
$generatedCount = (int)$user['qr_generated_count'];
$requestedCount = count($textsArray);

if ($limit > 0 && ($generatedCount + $requestedCount) > $limit) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => "QR Code generation limit reached. You requested $requestedCount QR(s) but only have " . max(0, $limit - $generatedCount) . " remaining."]);
    exit;
}

$format = $input['format'] ?? 'base64'; // 'base64' or 'image'
$scale = isset($input['scale']) ? (int)$input['scale'] : 5;
$quietzoneSize = isset($input['quietzoneSize']) ? (int)$input['quietzoneSize'] : 4;
$dotStyle = $input['dotStyle'] ?? 'square';

$options = new QROptions();
$options->outputType = QRMarkupSVG::class;
$options->scale = max(1, min($scale, 50));
$options->quietzoneSize = max(0, min($quietzoneSize, 75));
$options->addQuietzone = ($options->quietzoneSize > 0);
$options->imageBase64 = ($format === 'base64');

if ($dotStyle === 'round') {
    $options->drawCircularModules = true;
    $options->circleRadius = 0.45;
    $options->keepAsSquare = [
        QRMatrix::M_FINDER | QRMatrix::IS_DARK,
        QRMatrix::M_FINDER,
        QRMatrix::M_FINDER_DOT | QRMatrix::IS_DARK,
        QRMatrix::M_ALIGNMENT | QRMatrix::IS_DARK,
        QRMatrix::M_ALIGNMENT
    ];
}

$results = [];

if ($format === 'base64') {
    $options->imageBase64 = true;
    
    foreach ($textsArray as $text) {
        $qrcode = (new QRCode($options))->render($text);
        $auth->logQrCode($user['id'], $text, $qrcode, 'base64', $options->scale, $options->quietzoneSize);
        $results[] = [
            'text' => $text,
            'format' => 'base64',
            'data' => $qrcode
        ];
    }
    
    $auth->incrementQrCount($user['id'], $requestedCount);
    
    if (!$isBulk) {
        echo json_encode([
            'success' => true,
            'format' => 'base64',
            'data' => $results[0]['data'],
            'qr_generated_count' => $generatedCount + $requestedCount,
            'qr_limit' => $limit
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'format' => 'base64',
            'results' => $results,
            'qr_generated_count' => $generatedCount + $requestedCount,
            'qr_limit' => $limit
        ]);
    }
} else {
    // Return image URL. We save it in a public temp folder.
    $tempDir = __DIR__ . '/public/qrcodes';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }
    
    $options->imageBase64 = false;
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $domainName = $_SERVER['HTTP_HOST'];
    
    foreach ($textsArray as $text) {
        $filename = md5($text . time() . rand(0, 9999)) . '.svg';
        $filepath = $tempDir . '/' . $filename;
        
        $qrcodeContent = (new QRCode($options))->render($text);
        file_put_contents($filepath, $qrcodeContent);
        
        $publicUrl = $protocol . $domainName . '/api/public/qrcodes/' . $filename;
        $auth->logQrCode($user['id'], $text, $publicUrl, 'image', $options->scale, $options->quietzoneSize);
        
        $results[] = [
            'text' => $text,
            'format' => 'image',
            'url' => $publicUrl
        ];
    }
    
    $auth->incrementQrCount($user['id'], $requestedCount);
    
    if (!$isBulk) {
        echo json_encode([
            'success' => true,
            'format' => 'image',
            'url' => $results[0]['url'],
            'qr_generated_count' => $generatedCount + $requestedCount,
            'qr_limit' => $limit
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'format' => 'image',
            'results' => $results,
            'qr_generated_count' => $generatedCount + $requestedCount,
            'qr_limit' => $limit
        ]);
    }
}
