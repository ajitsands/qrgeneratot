<?php
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
    echo json_encode(['success' => false, 'message' => 'QR code text is required']);
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
    $publicUrl = $protocol . $domainName . '/qrcode_generator/backend/public/qrcodes/' . $filename;
    
    echo json_encode([
        'success' => true,
        'format' => 'image',
        'url' => $publicUrl
    ]);
}
