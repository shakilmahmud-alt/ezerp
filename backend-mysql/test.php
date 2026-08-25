<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = getDb();
    
    // Fetch all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $tableStats = [];
    foreach ($tables as $t) {
        $countStmt = $pdo->query("SELECT COUNT(*) FROM `{$t}`");
        $cnt = $countStmt->fetchColumn();
        $tableStats[$t] = (int)$cnt;
    }

    echo json_encode([
        "status" => "success",
        "message" => "MySQL Database Connection is Healthy and Active!",
        "database" => DB_NAME,
        "total_tables" => count($tables),
        "table_row_counts" => $tableStats,
        "timestamp" => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
