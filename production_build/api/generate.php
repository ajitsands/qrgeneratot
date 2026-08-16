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
require_once __DIR__ . '/LicenseManager.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRGdImagePNG;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Check License first!
$dbConfig = require __DIR__ . '/config.php';
$licenseManager = new LicenseManager($dbConfig);
$licenseStatus = $licenseManager->verifyLicenseLocally();

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

$options = new QROptions();
$options->outputType = QRGdImagePNG::class;
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
