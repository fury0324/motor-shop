<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

date_default_timezone_set('Asia/Manila');

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

$response = ['success' => false, 'message' => '', 'items' => []];

try {
    $stmt = $pdo->query("
        SELECT id, sku, name, brand, category, type, price, 
               stock, status, statusColor, image,
               created_at, updated_at
        FROM inventory 
        ORDER BY name ASC
    ");
    
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'inventory_units'");
    $unitsTableExists = $tableCheck->rowCount() > 0;
    
    if ($unitsTableExists) {
        foreach ($items as &$item) {
            $unitStmt = $pdo->prepare("
                SELECT id, engine_number, chassis_number, color, unit_status, notes, created_at
                FROM inventory_units 
                WHERE inventory_id = ?
                ORDER BY 
                    CASE unit_status 
                        WHEN 'Available' THEN 1 
                        WHEN 'Reserved' THEN 2 
                        WHEN 'Sold' THEN 3 
                        WHEN 'In Transit' THEN 4 
                    END,
                    created_at DESC
            ");
            $unitStmt->execute([$item['id']]);
            $item['units'] = $unitStmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } else {
        foreach ($items as &$item) {
            $item['units'] = [];
        }
    }
    
    $response['success'] = true;
    $response['items'] = $items;
    
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
}

echo json_encode($response);
?>