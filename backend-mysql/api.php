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
$onConflict = isset($_GET['on_conflict']) ? trim($_GET['on_conflict']) : '';

// Validate Table Name
if ($table && !preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid table name"]);
    exit();
}

try {
    // ----------------------------------------------------
    // 1. GET Requests: Querying, Filtering & Relations
    // ----------------------------------------------------
    if ($method === 'GET') {
        if (!$table) {
            echo json_encode([
                "status" => "online",
                "service" => "EG ERP MySQL REST API",
                "version" => "2.2.0",
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
        $reserved = ['table', 'select', 'order', 'limit', 'offset', 'count', 'action', 'on_conflict'];

        foreach ($_GET as $key => $val) {
            if (in_array($key, $reserved)) continue;
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $key)) continue;

            if (is_string($val)) {
                // NOT IN pattern
                if (str_starts_with($val, 'not.in.(') && str_ends_with($val, ')')) {
                    $inValues = explode(',', substr($val, 8, -1));
                    $cleanVals = [];
                    foreach ($inValues as $iv) {
                        $c = trim($iv, " '\"()");
                        if ($c !== '') $cleanVals[] = $c;
                    }
                    if (count($cleanVals) > 0) {
                        $placeholders = implode(',', array_fill(0, count($cleanVals), '?'));
                        $whereClauses[] = "`{$table}`.`{$key}` NOT IN ({$placeholders})";
                        foreach ($cleanVals as $cv) {
                            $params[] = $cv;
                        }
                    }
                } elseif (str_starts_with($val, 'in.(') && str_ends_with($val, ')')) {
                    $inValues = explode(',', substr($val, 4, -1));
                    $cleanVals = [];
                    foreach ($inValues as $iv) {
                        $c = trim($iv, " '\"()");
                        if ($c !== '') $cleanVals[] = $c;
                    }
                    if (count($cleanVals) > 0) {
                        $placeholders = implode(',', array_fill(0, count($cleanVals), '?'));
                        $whereClauses[] = "`{$table}`.`{$key}` IN ({$placeholders})";
                        foreach ($cleanVals as $cv) {
                            $params[] = $cv;
                        }
                    }
                } elseif ($val === 'not.is.null') {
                    $whereClauses[] = "`{$table}`.`{$key}` IS NOT NULL";
                } elseif ($val === 'is.null') {
                    $whereClauses[] = "`{$table}`.`{$key}` IS NULL";
                } elseif (str_starts_with($val, 'eq.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` = ?";
                    $params[] = substr($val, 3);
                } elseif (str_starts_with($val, 'neq.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` != ?";
                    $params[] = substr($val, 4);
                } elseif (str_starts_with($val, 'gt.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` > ?";
                    $params[] = substr($val, 3);
                } elseif (str_starts_with($val, 'gte.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` >= ?";
                    $params[] = substr($val, 4);
                } elseif (str_starts_with($val, 'lt.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` < ?";
                    $params[] = substr($val, 3);
                } elseif (str_starts_with($val, 'lte.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` <= ?";
                    $params[] = substr($val, 4);
                } elseif (str_starts_with($val, 'like.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` LIKE ?";
                    $params[] = substr($val, 5);
                } elseif (str_starts_with($val, 'ilike.')) {
                    $whereClauses[] = "`{$table}`.`{$key}` LIKE ?";
                    $params[] = substr($val, 6);
                } else {
                    $whereClauses[] = "`{$table}`.`{$key}` = ?";
                    $params[] = $val;
                }
            } else {
                $whereClauses[] = "`{$table}`.`{$key}` = ?";
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
                    $orderList[] = "`{$table}`.`{$col}` {$dir}";
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
        $querySql = "SELECT `{$table}`.* FROM `{$table}` {$whereSql}{$orderSql}{$limitSql}";
        $stmt = $pdo->prepare($querySql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // ----------------------------------------------------
        // Foreign Key Relation Resolution (Auto Nested Objects)
        // ----------------------------------------------------
        if (count($rows) > 0) {
            // 1. If table is 'employees' and select requested 'stores' or 'stores(name)'
            if ($table === 'employees' && str_contains($select, 'stores')) {
                $storeIds = array_unique(array_filter(array_column($rows, 'store_id')));
                $storesMap = [];
                if (count($storeIds) > 0) {
                    $stPh = implode(',', array_fill(0, count($storeIds), '?'));
                    $stStmt = $pdo->prepare("SELECT `id`, `name` FROM `stores` WHERE `id` IN ({$stPh})");
                    $stStmt->execute(array_values($storeIds));
                    foreach ($stStmt->fetchAll() as $st) {
                        $storesMap[$st['id']] = $st;
                    }
                }
                foreach ($rows as &$r) {
                    $r['stores'] = isset($r['store_id']) && isset($storesMap[$r['store_id']]) ? $storesMap[$r['store_id']] : null;
                }
            }

            // 2. If table is 'products' and select requested category, brand, vendor, or store_stocks
            if ($table === 'products') {
                $catIds = array_unique(array_filter(array_column($rows, 'category_id')));
                if (count($catIds) > 0 && str_contains($select, 'category')) {
                    $ph = implode(',', array_fill(0, count($catIds), '?'));
                    $cStmt = $pdo->prepare("SELECT `id`, `name` FROM `categories` WHERE `id` IN ({$ph})");
                    $cStmt->execute(array_values($catIds));
                    $catMap = [];
                    foreach ($cStmt->fetchAll() as $c) { $catMap[$c['id']] = $c; }
                    foreach ($rows as &$r) {
                        $r['category'] = isset($r['category_id']) && isset($catMap[$r['category_id']]) ? $catMap[$r['category_id']] : null;
                        $r['categories'] = $r['category'];
                    }
                }

                if (str_contains($select, 'store_stocks')) {
                    $prodIds = array_unique(array_filter(array_column($rows, 'id')));
                    if (count($prodIds) > 0) {
                        $pPh = implode(',', array_fill(0, count($prodIds), '?'));
                        $ssStmt = $pdo->prepare("SELECT `id`, `store_id`, `product_id`, `stock_qty` FROM `store_stocks` WHERE `product_id` IN ({$pPh})");
                        $ssStmt->execute(array_values($prodIds));
                        $ssGroup = [];
                        foreach ($ssStmt->fetchAll() as $ss) {
                            $ssGroup[$ss['product_id']][] = $ss;
                        }
                        foreach ($rows as &$r) {
                            $r['store_stocks'] = isset($ssGroup[$r['id']]) ? $ssGroup[$r['id']] : [];
                        }
                    }
                }
            }

            // 3. If table is 'sale_items' and select requested 'sale'
            if ($table === 'sale_items' && str_contains($select, 'sale')) {
                $saleIds = array_unique(array_filter(array_column($rows, 'sale_id')));
                if (count($saleIds) > 0) {
                    $sPh = implode(',', array_fill(0, count($saleIds), '?'));
                    $sStmt = $pdo->prepare("SELECT `id`, `invoice_no`, `sale_date`, `sales_executive_name`, `created_at` FROM `sales` WHERE `id` IN ({$sPh})");
                    $sStmt->execute(array_values($saleIds));
                    $salesMap = [];
                    foreach ($sStmt->fetchAll() as $s) { $salesMap[$s['id']] = $s; }
                    foreach ($rows as &$r) {
                        $r['sale'] = isset($r['sale_id']) && isset($salesMap[$r['sale_id']]) ? $salesMap[$r['sale_id']] : null;
                    }
                }
            }
        }

        // Decode JSON strings if any
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
    // 2. POST Requests: Insert, Bulk Insert & Upsert
    // ----------------------------------------------------
    if ($method === 'POST') {
        if (!$table) {
            http_response_code(400);
            echo json_encode(["error" => "Table name is required"]);
            exit();
        }

        $records = [];
        if (isset($body[0]) && is_array($body[0])) {
            $records = $body;
        } else {
            $records = [$body];
        }

        $insertedRows = [];
        $pdo->beginTransaction();

        foreach ($records as $row) {
            if (!is_array($row)) continue;

            // Handle UPSERT with on_conflict
            if ($action === 'upsert' && $onConflict && isset($row[$onConflict])) {
                $checkStmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `{$onConflict}` = ?");
                $checkStmt->execute([$row[$onConflict]]);
                $existing = $checkStmt->fetch();

                if ($existing) {
                    $setClauses = [];
                    $setVals = [];
                    foreach ($row as $k => $v) {
                        if ($k === 'id') continue;
                        if (!preg_match('/^[a-zA-Z0-9_]+$/', $k)) continue;
                        $setClauses[] = "`{$k}` = ?";
                        if (is_array($v) || is_object($v)) {
                            $setVals[] = json_encode($v, JSON_UNESCAPED_UNICODE);
                        } elseif (is_bool($v)) {
                            $setVals[] = $v ? 1 : 0;
                        } else {
                            $setVals[] = $v;
                        }
                    }
                    if (count($setClauses) > 0) {
                        $setVals[] = $row[$onConflict];
                        $updSql = "UPDATE `{$table}` SET " . implode(', ', $setClauses) . " WHERE `{$onConflict}` = ?";
                        $uStmt = $pdo->prepare($updSql);
                        $uStmt->execute($setVals);
                    }
                    $checkStmt->execute([$row[$onConflict]]);
                    $insertedRows[] = $checkStmt->fetch();
                    continue;
                }
            }

            // Normal Insert
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
        $reserved = ['table', 'action', 'on_conflict'];
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
            if ($k === 'id') continue;
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

        $reserved = ['table', 'action', 'on_conflict'];
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
