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
    // Simplified query muna - walang units
    $stmt = $pdo->query("
        SELECT id, sku, name, brand, category, type, price, 
               description, stock, status, statusColor, image, color,
               created_at, updated_at
        FROM inventory 
        ORDER BY name ASC
    ");
    
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Lagyan ng empty units array para sa bawat item
    foreach ($items as &$item) {
        $item['units'] = [];
    }
    
    $response['success'] = true;
    $response['items'] = $items;
    
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
}

echo json_encode($response);
?>