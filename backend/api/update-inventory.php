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
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $type = $_POST['type'] ?? '';
    $price = $_POST['price'] ?? 0;
    $stock = $_POST['stock'] ?? 0;
    $image = $_POST['image'] ?? '';
    
    if (empty($id)) {
        $response['message'] = 'Item ID is required';
        echo json_encode($response);
        exit();
    }
    
    if ($stock == 0) {
        $status = 'Out of Stock';
        $statusColor = 'red';
    } elseif ($stock <= 5) {
        $status = 'Low Stock';
        $statusColor = 'amber';
    } else {
        $status = 'In Stock';
        $statusColor = 'green';
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE inventory SET name = ?, category = ?, type = ?, price = ?, stock = ?, status = ?, statusColor = ?, image = ? WHERE id = ?");
        $stmt->execute([$name, $category, $type, $price, $stock, $status, $statusColor, $image, $id]);
        
        $response['success'] = true;
        $response['message'] = 'Item updated successfully';
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>