<?php
/**
 * EG ERP Database Configuration for cPanel MySQL
 * Database: holidaym_ezerp
 * Host: api.holidaymartbd.com / ezerp
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'holidaym_admin');
define('DB_PASS', 'msm039raqeeb');
define('DB_NAME', 'holidaym_ezerp');
define('DB_PORT', '3306');

// Set Headers for Global CORS & JSON Response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, apikey, prefer');
header('Content-Type: application/json; charset=UTF-8');

// Handle CORS preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Returns a configured PDO Database instance with fallback support
 */
function getDb() {
    static $pdo = null;
    if ($pdo === null) {
        $hosts = [DB_HOST, '127.0.0.1'];
        $lastException = null;

        foreach ($hosts as $host) {
            try {
                $dsn = "mysql:host={$host};dbname=" . DB_NAME . ";port=" . DB_PORT . ";charset=utf8mb4";
                $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
                return $pdo;
            } catch (PDOException $e) {
                $lastException = $e;
            }
        }

        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Database connection failed: " . ($lastException ? $lastException->getMessage() : "Unknown error"),
            "hint" => "Please verify in cPanel > MySQL Users that password for user '" . DB_USER . "' matches DB_PASS exactly."
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    return $pdo;
}
