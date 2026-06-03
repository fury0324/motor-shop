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
    $sku = $_POST['sku'] ?? '';
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $type = $_POST['type'] ?? '';
    $color = $_POST['color'] ?? '';
    $price = $_POST['price'] ?? 0;
    $stock = $_POST['stock'] ?? 0;
    $image = $_POST['image_url'] ?? '';

    
    // Handle file upload
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $fileExtension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
        $uploadPath = $uploadDir . $fileName;
        
        if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
            $image = 'http://localhost:8080/motor-shop/backend/uploads/' . $fileName;
        }
    }
    
    if (empty($name) || empty($category) || empty($type) || empty($color)) {
        $response['message'] = 'Name, category, type and color are required';
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
        $stmt = $pdo->prepare("INSERT INTO inventory (sku, name, category, type, color, price, stock, status, statusColor, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$sku, $name, $category, $type, $color, $price, $stock, $status, $statusColor, $image]);
        
        $response['success'] = true;
        $response['message'] = 'Item added successfully';
        $response['item'] = [
            'id' => $pdo->lastInsertId(),
            'sku' => $sku,
            'name' => $name,
            'category' => $category,
            'type' => $type,
            'color' => $color,
            'price' => $price,
            'stock' => $stock,
            'status' => $status,
            'statusColor' => $statusColor,
            'image' => $image
        ];
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>