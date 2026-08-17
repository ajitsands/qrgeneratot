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

if (!$input || empty($input['email']) || empty($input['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}

try {
    $dbConfig = require dirname(__DIR__) . '/config.php';
    $auth = new Auth($dbConfig);
    
    $result = $auth->login($input['email'], $input['password']);
    
    echo json_encode([
        'success' => true,
        'token' => $result['token'],
        'user' => $result['user']
    ]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
