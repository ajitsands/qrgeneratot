<?php
error_reporting(0);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "PHP Error: $errstr in $errfile on line $errline"]);
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

if (!isset($input['ids']) || !is_array($input['ids'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valid array of IDs is required.']);
    exit;
}

// Convert IDs to integers to ensure safety
$ids = array_map('intval', $input['ids']);
$ids = array_filter($ids, function($id) { return $id > 0; });

if (empty($ids)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No valid IDs provided.']);
    exit;
}

$isAdmin = !empty($user['is_admin']);
$auth->deleteQrLogs($user['id'], $ids, $isAdmin);

echo json_encode(['success' => true, 'message' => 'Logs deleted successfully.']);
