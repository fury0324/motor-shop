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

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? '';
    
    if (empty($id)) {
        $response['message'] = 'Product ID is required';
        echo json_encode($response);
        exit();
    }
    
    try {
        // Start transaction
        $pdo->beginTransaction();
        
        // First, delete any units associated with this inventory item (if table exists)
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'inventory_units'");
        if ($tableCheck->rowCount() > 0) {
            $unitStmt = $pdo->prepare("DELETE FROM inventory_units WHERE inventory_id = ?");
            $unitStmt->execute([$id]);
        }
        
        // Then delete the inventory item
        $stmt = $pdo->prepare("DELETE FROM inventory WHERE id = ?");
        $stmt->execute([$id]);
        
        // Commit transaction
        $pdo->commit();
        
        $response['success'] = true;
        $response['message'] = 'Product deleted successfully';
        
    } catch (PDOException $e) {
        // Rollback on error
        $pdo->rollBack();
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>