<?php
error_reporting(0);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/Auth.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
    exit;
}

// TODO: Implement actual Captcha Verification logic here if needed
// if (empty($input['captcha_token'])) { ... }

try {
    $dbConfig = require dirname(__DIR__) . '/config.php';
    $auth = new Auth($dbConfig);
    
    $userId = $auth->registerUser($input);
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful! You can now log in.'
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
