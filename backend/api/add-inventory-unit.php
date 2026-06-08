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
    $inventory_id = $_POST['inventory_id'] ?? '';
    $engine_number = strtoupper(trim($_POST['engine_number'] ?? ''));
    $chassis_number = strtoupper(trim($_POST['chassis_number'] ?? ''));
    $color = $_POST['color'] ?? '';
    $notes = $_POST['notes'] ?? '';
    
    if (empty($inventory_id) || empty($engine_number) || empty($chassis_number)) {
        $response['message'] = 'Inventory ID, Engine number, and Chassis number are required';
        echo json_encode($response);
        exit();
    }
    
    // Check if engine/chassis already exists
    $checkStmt = $pdo->prepare("SELECT id FROM inventory_units WHERE engine_number = ? OR chassis_number = ?");
    $checkStmt->execute([$engine_number, $chassis_number]);
    if ($checkStmt->rowCount() > 0) {
        $response['message'] = 'Engine or Chassis number already exists!';
        echo json_encode($response);
        exit();
    }
    
    try {
        // Status is always 'Available' when adding new units
        $sql = "INSERT INTO inventory_units (inventory_id, engine_number, chassis_number, color, unit_status, notes) 
                VALUES (?, ?, ?, ?, 'Available', ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$inventory_id, $engine_number, $chassis_number, $color, $notes]);
        
        // Update inventory stock count
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_units WHERE inventory_id = ? AND unit_status = 'Available'");
        $countStmt->execute([$inventory_id]);
        $available = $countStmt->fetchColumn();
        
        $updateStmt = $pdo->prepare("UPDATE inventory SET stock = ?, status = ?, statusColor = ? WHERE id = ?");
        $status = $available > 0 ? 'In Stock' : 'Out of Stock';
        $statusColor = $available > 0 ? 'green' : 'red';
        $updateStmt->execute([$available, $status, $statusColor, $inventory_id]);
        
        $response['success'] = true;
        $response['message'] = 'Unit added successfully';
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>