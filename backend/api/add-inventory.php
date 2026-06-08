<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

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

function saveUploadedFile($file) {
    $targetDir = __DIR__ . '/../uploads/inventory/';
    if (!file_exists($targetDir)) mkdir($targetDir, 0777, true);
    
    $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file['name']);
    $targetFile = $targetDir . $fileName;
    
    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        return 'http://localhost:8080/motor-shop/backend/uploads/inventory/' . $fileName;
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sku = $_POST['sku'] ?? '';
    $name = $_POST['name'] ?? '';
    $brand = $_POST['brand'] ?? '';
    $category = $_POST['category'] ?? '';
    $type = $_POST['type'] ?? '';
    $price = $_POST['price'] ?? 0;
    $imageUrl = $_POST['image_url'] ?? '';
    
    if (empty($name) || empty($brand) || empty($category) || empty($type) || empty($price)) {
        $response['message'] = 'Missing required fields';
        echo json_encode($response);
        exit();
    }
    
    $imagePath = '';
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $uploadedPath = saveUploadedFile($_FILES['image']);
        if ($uploadedPath) $imagePath = $uploadedPath;
    } elseif (!empty($imageUrl)) {
        $imagePath = $imageUrl;
    }
    
    try {
        $sql = "INSERT INTO inventory (sku, name, brand, category, type, price, image, stock, status, statusColor) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'No Units', 'gray')";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$sku, $name, $brand, $category, $type, $price, $imagePath]);
        
        $response['success'] = true;
        $response['message'] = 'Model added successfully';
        $response['id'] = $pdo->lastInsertId();
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>