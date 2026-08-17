<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Proxy the request to avoid CORS issues on the frontend
$url = 'https://sandslab.com/get_our_latest_products.php';
$response = @file_get_contents($url);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to fetch products']);
    exit;
}

echo $response;
