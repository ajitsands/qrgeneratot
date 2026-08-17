<?php
// backend/Auth.php (and production_build/api/Auth.php)

class Auth {
    private $db;
    
    // JWT Secret Key (In production, this should be in an env file)
    private $jwtSecret = 'sandslab_super_secret_jwt_key_2026';

    public function __construct($dbConfig) {
        if (empty($dbConfig['host'])) {
            throw new Exception("Database host is required for multi-user authentication.");
        }
        
        $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset=utf8mb4";
        $this->db = new PDO($dsn, $dbConfig['user'], $dbConfig['password']);
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $this->initializeDatabase();
    }

    private function initializeDatabase() {
        $sql = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            domain_name VARCHAR(255) NOT NULL,
            domain_ip VARCHAR(50) NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            mobile VARCHAR(50) NOT NULL,
            license_key VARCHAR(255) DEFAULT NULL,
            license_token TEXT DEFAULT NULL,
            public_key TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        $this->db->exec($sql);
    }

    public function registerUser($data) {
        // Validate required fields
        $required = ['company_name', 'email', 'password', 'domain_name', 'domain_ip', 'contact_name', 'mobile'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }

        // Check if email already exists
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        if ($stmt->fetch()) {
            throw new Exception("Email address is already registered.");
        }

        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

        $stmt = $this->db->prepare("INSERT INTO users (company_name, email, password_hash, domain_name, domain_ip, contact_name, mobile) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['company_name'],
            $data['email'],
            $passwordHash,
            $data['domain_name'],
            $data['domain_ip'],
            $data['contact_name'],
            $data['mobile']
        ]);
        
        $userId = $this->db->lastInsertId();
        
        // Send email to admin
        $this->sendAdminNotificationEmail($data);

        return $userId;
    }

    private function sendAdminNotificationEmail($data) {
        $to = 'ajitsands@gmail.com';
        $subject = 'New User Registration - QR Code Generator';
        $message = "A new user has registered for the QR Code Generator.\n\n" .
                   "Company Name: {$data['company_name']}\n" .
                   "Email: {$data['email']}\n" .
                   "Domain Name: {$data['domain_name']}\n" .
                   "Domain IP: {$data['domain_ip']}\n" .
                   "Contact Person: {$data['contact_name']}\n" .
                   "Mobile: {$data['mobile']}\n";
                   
        $headers = "From: no-reply@{$data['domain_name']}\r\n";
        
        // Suppress errors in case mail server is not configured locally
        @mail($to, $subject, $message, $headers);
    }

    public function login($email, $password) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new Exception("Invalid email or password.");
        }

        // Generate JWT
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $user['id'],
            'email' => $user['email'],
            'exp' => time() + (86400 * 7) // 7 days expiration
        ]);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $this->jwtSecret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

        return [
            'token' => $jwt,
            'user' => [
                'id' => $user['id'],
                'company_name' => $user['company_name'],
                'email' => $user['email'],
                'has_license' => !empty($user['license_key']),
                'license_key' => $user['license_key']
            ]
        ];
    }

    public function verifyJWT($jwt) {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return false;
        }
        
        list($header, $payload, $signature) = $parts;
        
        $validSignature = hash_hmac('sha256', $header . "." . $payload, $this->jwtSecret, true);
        $validSignatureBase64Url = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));
        
        if (!hash_equals($validSignatureBase64Url, $signature)) {
            return false;
        }
        
        $payloadData = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
            return false; // Token expired
        }
        
        return $payloadData;
    }
    
    public function getUserById($userId) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getUserByLicenseKey($licenseKey) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE license_key = ?");
        $stmt->execute([$licenseKey]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function saveUserLicense($userId, $licenseKey, $token, $publicKey) {
        $stmt = $this->db->prepare("UPDATE users SET license_key = ?, license_token = ?, public_key = ? WHERE id = ?");
        $stmt->execute([$licenseKey, $token, $publicKey, $userId]);
    }
}
