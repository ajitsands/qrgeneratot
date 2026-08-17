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

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/Auth.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRGdImagePNG;
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

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

$user = null;
if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
    $payload = $auth->verifyJWT($jwt);
    if ($payload) {
        $user = $auth->getUserById($payload['user_id']);
    }
}

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$text = "https://www.sandslab.com";
$dotStyle = $input['dotStyle'] ?? 'square'; // 'square' or 'round'

$options = new QROptions();
$options->outputType = QRGdImagePNG::class;
$options->scale = 5;
$options->quietzoneSize = 4;
$options->addQuietzone = true;
$options->imageBase64 = true;

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

$qrcode = (new QRCode($options))->render($text);

echo json_encode([
    'success' => true,
    'data' => $qrcode,
    'style' => $dotStyle
]);
