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

$response = ['success' => false, 'message' => '', 'units' => []];

$inventory_id = $_GET['inventory_id'] ?? '';

if (empty($inventory_id)) {
    $response['message'] = 'Inventory ID is required';
    echo json_encode($response);
    exit();
}

try {
    $stmt = $pdo->prepare("
        SELECT id, engine_number, chassis_number, color, unit_status, notes, created_at,
               selling_price
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
    $stmt->execute([$inventory_id]);
    
    $response['success'] = true;
    $response['units'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
}

echo json_encode($response);
?>