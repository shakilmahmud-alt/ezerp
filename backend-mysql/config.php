<?php
/**
 * EG ERP Database Configuration for cPanel MySQL
 * Database: holidaym_ezerp
 * Host: api.holidaymartbd.com / ezerp
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'holidaym_admin');
define('DB_PASS', 'mssm039raqeeb');
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
 * Returns a configured PDO Database instance
 */
function getDb() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";port=" . DB_PORT . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "message" => "Database connection failed: " . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
    return $pdo;
}
