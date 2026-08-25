<?php
/**
 * EG ERP Unified REST API Engine for cPanel MySQL Backend
 * Location: api.holidaymartbd.com/ezerp/api.php
 */

require_once __DIR__ . '/config.php';

$pdo = getDb();
$method = $_SERVER['REQUEST_METHOD'];

// Helper: Generate UUID v4
function generateUuid() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Get raw JSON input
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

// Parse Query Parameters
$table = isset($_GET['table']) ? trim($_GET['table']) : '';
$action = isset($_GET['action']) ? trim($_GET['action']) : '';

// Validate Table Name (alphanumeric and underscores only to prevent SQL injection)
if ($table && !preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid table name"]);
    exit();
}

try {
    // ----------------------------------------------------
    // 1. GET Requests: Querying & Filtering
    // ----------------------------------------------------
    if ($method === 'GET') {
        if (!$table) {
            echo json_encode([
                "status" => "online",
                "service" => "EG ERP MySQL REST API",
                "version" => "2.0.0",
                "database" => DB_NAME
            ]);
            exit();
        }

        $select = isset($_GET['select']) && $_GET['select'] !== '' ? $_GET['select'] : '*';
        $order = isset($_GET['order']) ? $_GET['order'] : '';
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $wantCount = isset($_GET['count']) && $_GET['count'] === 'exact';

        $whereClauses = [];
        $params = [];

        // Reserved GET params
        $reserved = ['table', 'select', 'order', 'limit', 'offset', 'count', 'action'];

        foreach ($_GET as $key => $val) {
            if (in_array($key, $reserved)) continue;
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $key)) continue;

            if (is_string($val)) {
                // Pattern matching for eq, in, gte, lte, like, is
                if (str_starts_with($val, 'eq.')) {
                    $whereClauses[] = "`{$key}` = ?";
                    $params[] = substr($val, 3);
                } elseif (str_starts_with($val, 'neq.')) {
                    $whereClauses[] = "`{$key}` != ?";
                    $params[] = substr($val, 4);
                } elseif (str_starts_with($val, 'gt.')) {
                    $whereClauses[] = "`{$key}` > ?";
                    $params[] = substr($val, 3);
                } elseif (str_starts_with($val, 'gte.')) {
                    $whereClauses[] = "`{$key}` >= ?";
                    $params[] = substr($val, 4);
                } elseif (str_starts_with($val, 'lt.')) {
                    $whereClauses[] = "`{$key}` < ?";
                    $params[] = substr($val, 3);
                } elseif (str_starts_with($val, 'lte.')) {
                    $whereClauses[] = "`{$key}` <= ?";
                    $params[] = substr($val, 4);
                } elseif (str_starts_with($val, 'like.')) {
                    $whereClauses[] = "`{$key}` LIKE ?";
                    $params[] = substr($val, 5);
                } elseif (str_starts_with($val, 'ilike.')) {
                    $whereClauses[] = "`{$key}` LIKE ?";
                    $params[] = substr($val, 6);
                } elseif (str_starts_with($val, 'in.(') && str_ends_with($val, ')')) {
                    $inValues = explode(',', substr($val, 4, -1));
                    $placeholders = implode(',', array_fill(0, count($inValues), '?'));
                    $whereClauses[] = "`{$key}` IN ({$placeholders})";
                    foreach ($inValues as $iv) {
                        $params[] = trim($iv, " '\"");
                    }
                } elseif ($val === 'is.null') {
                    $whereClauses[] = "`{$key}` IS NULL";
                } elseif ($val === 'not.is.null') {
                    $whereClauses[] = "`{$key}` IS NOT NULL";
                } else {
                    $whereClauses[] = "`{$key}` = ?";
                    $params[] = $val;
                }
            } else {
                $whereClauses[] = "`{$key}` = ?";
                $params[] = $val;
            }
        }

        $whereSql = '';
        if (count($whereClauses) > 0) {
            $whereSql = ' WHERE ' . implode(' AND ', $whereClauses);
        }

        // Count query if requested
        $totalCount = null;
        if ($wantCount) {
            $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM `{$table}` {$whereSql}");
            $cntStmt->execute($params);
            $totalCount = (int)$cntStmt->fetchColumn();
        }

        // Ordering
        $orderSql = '';
        if ($order) {
            $orderParts = explode(',', $order);
            $orderList = [];
            foreach ($orderParts as $op) {
                $parts = explode('.', trim($op));
                $col = $parts[0];
                $dir = isset($parts[1]) && strtolower($parts[1]) === 'desc' ? 'DESC' : 'ASC';
                if (preg_match('/^[a-zA-Z0-9_]+$/', $col)) {
                    $orderList[] = "`{$col}` {$dir}";
                }
            }
            if (count($orderList) > 0) {
                $orderSql = ' ORDER BY ' . implode(', ', $orderList);
            }
        }

        // Pagination
        $limitSql = '';
        if ($limit > 0) {
            $limitSql = " LIMIT {$limit}";
            if ($offset > 0) {
                $limitSql .= " OFFSET {$offset}";
            }
        }

        // Execute Select
        $querySql = "SELECT * FROM `{$table}` {$whereSql}{$orderSql}{$limitSql}";
        $stmt = $pdo->prepare($querySql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Decode JSON fields if any
        foreach ($rows as &$r) {
            foreach ($r as $k => $v) {
                if (is_string($v) && (str_starts_with($v, '{') || str_starts_with($v, '['))) {
                    $decoded = json_decode($v, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $r[$k] = $decoded;
                    }
                }
            }
        }

        if ($wantCount) {
            echo json_encode(["data" => $rows, "count" => $totalCount, "error" => null], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // ----------------------------------------------------
    // 2. POST Requests: Insert Single or Bulk Rows
    // ----------------------------------------------------
    if ($method === 'POST') {
        if (!$table) {
            http_response_code(400);
            echo json_encode(["error" => "Table name is required"]);
            exit();
        }

        $records = [];
        if (isset($body[0]) && is_array($body[0])) {
            $records = $body; // Bulk insert
        } else {
            $records = [$body]; // Single row insert
        }

        $insertedRows = [];
        $pdo->beginTransaction();

        foreach ($records as $row) {
            if (!is_array($row)) continue;

            // Generate UUID if id is missing or empty
            if (empty($row['id'])) {
                $row['id'] = generateUuid();
            }

            $cols = [];
            $placeholders = [];
            $vals = [];

            foreach ($row as $k => $v) {
                if (!preg_match('/^[a-zA-Z0-9_]+$/', $k)) continue;
                $cols[] = "`{$k}`";
                $placeholders[] = '?';

                if (is_array($v) || is_object($v)) {
                    $vals[] = json_encode($v, JSON_UNESCAPED_UNICODE);
                } elseif (is_bool($v)) {
                    $vals[] = $v ? 1 : 0;
                } else {
                    $vals[] = $v;
                }
            }

            $colSql = implode(', ', $cols);
            $phSql = implode(', ', $placeholders);

            $insSql = "INSERT INTO `{$table}` ({$colSql}) VALUES ({$phSql})";
            $stmt = $pdo->prepare($insSql);
            $stmt->execute($vals);

            // Fetch inserted row
            $fetchStmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `id` = ?");
            $fetchStmt->execute([$row['id']]);
            $insertedRows[] = $fetchStmt->fetch() ?: $row;
        }

        $pdo->commit();

        if (isset($body[0])) {
            echo json_encode($insertedRows, JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode($insertedRows[0] ?? null, JSON_UNESCAPED_UNICODE);
        }
        exit();
    }

    // ----------------------------------------------------
    // 3. PUT / PATCH Requests: Update Rows
    // ----------------------------------------------------
    if ($method === 'PUT' || $method === 'PATCH') {
        if (!$table) {
            http_response_code(400);
            echo json_encode(["error" => "Table name is required"]);
            exit();
        }

        $whereClauses = [];
        $whereParams = [];

        // Build WHERE filter from query string
        $reserved = ['table', 'action'];
        foreach ($_GET as $key => $val) {
            if (in_array($key, $reserved)) continue;
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $key)) continue;

            if (str_starts_with($val, 'eq.')) {
                $whereClauses[] = "`{$key}` = ?";
                $whereParams[] = substr($val, 3);
            } else {
                $whereClauses[] = "`{$key}` = ?";
                $whereParams[] = $val;
            }
        }

        if (count($whereClauses) === 0 && isset($body['id'])) {
            $whereClauses[] = "`id` = ?";
            $whereParams[] = $body['id'];
        }

        if (count($whereClauses) === 0) {
            http_response_code(400);
            echo json_encode(["error" => "At least one condition (e.g. ?id=eq.xxx) is required for update"]);
            exit();
        }

        $setClauses = [];
        $setParams = [];

        foreach ($body as $k => $v) {
            if ($k === 'id') continue; // Don't update primary key id
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $k)) continue;

            $setClauses[] = "`{$k}` = ?";
            if (is_array($v) || is_object($v)) {
                $setParams[] = json_encode($v, JSON_UNESCAPED_UNICODE);
            } elseif (is_bool($v)) {
                $setParams[] = $v ? 1 : 0;
            } else {
                $setParams[] = $v;
            }
        }

        if (count($setClauses) === 0) {
            echo json_encode(["message" => "No fields to update"]);
            exit();
        }

        $setSql = implode(', ', $setClauses);
        $whereSql = implode(' AND ', $whereClauses);

        $updateSql = "UPDATE `{$table}` SET {$setSql} WHERE {$whereSql}";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute(array_merge($setParams, $whereParams));

        // Fetch updated rows
        $fetchStmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE {$whereSql}");
        $fetchStmt->execute($whereParams);
        $updatedRows = $fetchStmt->fetchAll();

        echo json_encode($updatedRows, JSON_UNESCAPED_UNICODE);
        exit();
    }

    // ----------------------------------------------------
    // 4. DELETE Requests: Delete Rows
    // ----------------------------------------------------
    if ($method === 'DELETE') {
        if (!$table) {
            http_response_code(400);
            echo json_encode(["error" => "Table name is required"]);
            exit();
        }

        $whereClauses = [];
        $whereParams = [];

        $reserved = ['table', 'action'];
        foreach ($_GET as $key => $val) {
            if (in_array($key, $reserved)) continue;
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $key)) continue;

            if (str_starts_with($val, 'eq.')) {
                $whereClauses[] = "`{$key}` = ?";
                $whereParams[] = substr($val, 3);
            } else {
                $whereClauses[] = "`{$key}` = ?";
                $whereParams[] = $val;
            }
        }

        if (count($whereClauses) === 0) {
            http_response_code(400);
            echo json_encode(["error" => "At least one condition (e.g. ?id=eq.xxx) is required for deletion"]);
            exit();
        }

        $whereSql = implode(' AND ', $whereClauses);
        $delSql = "DELETE FROM `{$table}` WHERE {$whereSql}";
        $stmt = $pdo->prepare($delSql);
        $stmt->execute($whereParams);

        echo json_encode(["status" => "success", "deleted" => $stmt->rowCount()], JSON_UNESCAPED_UNICODE);
        exit();
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
