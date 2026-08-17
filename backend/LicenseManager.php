<?php

class LicenseManager {
    private $dbConnection;
    private $jsonFilePath = __DIR__ . '/license_data.json';
    private $useDb = false;

    public function __construct($dbConfig = null) {
        if ($dbConfig && !empty($dbConfig['host'])) {
            try {
                $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset=utf8mb4";
                $this->dbConnection = new PDO($dsn, $dbConfig['user'], $dbConfig['password']);
                $this->dbConnection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->useDb = true;
                $this->initializeDatabase();
            } catch (PDOException $e) {
                // Fallback to JSON if DB connection fails
                error_log("Database connection failed: " . $e->getMessage() . ". Falling back to JSON storage.");
                $this->useDb = false;
            }
        } else {
            $this->useDb = false;
        }
    }

    private function initializeDatabase() {
        $sql = "CREATE TABLE IF NOT EXISTS licenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            license_key VARCHAR(255) NOT NULL,
            token TEXT NOT NULL,
            public_key TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        $this->dbConnection->exec($sql);
    }

    public function saveLicense($licenseKey, $token, $publicKey) {
        if ($this->useDb) {
            $stmt = $this->dbConnection->query("SELECT id FROM licenses LIMIT 1");
            if ($stmt->fetch()) {
                $update = $this->dbConnection->prepare("UPDATE licenses SET license_key = ?, token = ?, public_key = ?");
                $update->execute([$licenseKey, $token, $publicKey]);
            } else {
                $insert = $this->dbConnection->prepare("INSERT INTO licenses (license_key, token, public_key) VALUES (?, ?, ?)");
                $insert->execute([$licenseKey, $token, $publicKey]);
            }
        } else {
            $data = [
                'license_key' => $licenseKey,
                'token' => $token,
                'public_key' => $publicKey
            ];
            file_put_contents($this->jsonFilePath, json_encode($data, JSON_PRETTY_PRINT));
        }
    }

    public function getLicenseData() {
        if ($this->useDb) {
            $stmt = $this->dbConnection->query("SELECT token, public_key FROM licenses LIMIT 1");
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            if (file_exists($this->jsonFilePath)) {
                return json_decode(file_get_contents($this->jsonFilePath), true);
            }
            return false;
        }
    }

    public function verifyLicenseLocally() {
        $data = $this->getLicenseData();
        if (!$data || empty($data['token']) || empty($data['public_key'])) {
            return ['valid' => false, 'message' => 'No license installed.'];
        }
        return $this->verifyLicenseDataLocally($data['token'], $data['public_key']);
    }

    public function verifyLicenseDataLocally($token, $publicKey) {
        $parts = explode('.', $token);
        if (count($parts) !== 2) return ['valid' => false, 'message' => 'Invalid token format.'];
        
        list($payloadBase64, $signatureBase64) = $parts;
        $payloadJson = base64_decode($payloadBase64);
        $signature = base64_decode($signatureBase64);
        $payload = json_decode($payloadJson, true);

        // 1. Verify RSA Signature using OpenSSL
        $ok = openssl_verify($payloadJson, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) {
            return ['valid' => false, 'message' => 'Signature mismatch. Token is corrupted or forged.'];
        }

        // 2. Verify Domain Matches
        $currentDomain = preg_replace('#^https?://#', '', strtolower($_SERVER['HTTP_HOST'] ?? 'localhost'));
        $licenseDomain = preg_replace('#^https?://#', '', strtolower($payload['domain_name']));
        
        if (explode(':', $currentDomain)[0] !== explode(':', $licenseDomain)[0]) {
            // Uncomment the next line to strictly check domain
            // return ['valid' => false, 'message' => 'Domain mismatch.'];
        }

        // 3. Verify Expiry Date (if applicable)
        if (!empty($payload['expiry_date']) && date('Y-m-d') > $payload['expiry_date']) {
            return ['valid' => false, 'message' => 'License expired.'];
        }

        return ['valid' => true, 'payload' => $payload];
    }
}
