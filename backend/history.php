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

require_once __DIR__ . '/Auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dbConfig = require __DIR__ . '/config.php';
$auth = new Auth($dbConfig);

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$jwt = $matches[1];
$payload = $auth->verifyJWT($jwt);

if (!$payload) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $targetUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

        if ($targetUserId) {
            // Check if admin is requesting or the user themselves
            if (empty($payload['is_admin']) && $payload['user_id'] != $targetUserId) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Forbidden: Cannot access logs of other users']);
                exit;
            }
            $logs = $auth->getAllQrLogs($targetUserId);
        } else {
            // Admin wants all logs, or user wants their own logs?
            // If they pass ?all=1 and they are admin, fetch all
            if (isset($_GET['all']) && $_GET['all'] == '1') {
                if (empty($payload['is_admin'])) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Forbidden: Admin access required']);
                    exit;
                }
                $logs = $auth->getAllQrLogs();
            } else {
                // Otherwise just fetch their own
                $logs = $auth->getUserQrLogs($payload['user_id']);
            }
        }
        
        echo json_encode(['success' => true, 'logs' => $logs]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
