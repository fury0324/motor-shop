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
    $id = $_POST['id'] ?? '';
    $name = $_POST['name'] ?? '';
    $brand = $_POST['brand'] ?? '';
    $category = $_POST['category'] ?? '';
    $type = $_POST['type'] ?? '';
    $price = $_POST['price'] ?? 0;
    $imageUrl = $_POST['image_url'] ?? '';
    
    if (empty($id)) {
        $response['message'] = 'Product ID is required';
        echo json_encode($response);
        exit();
    }
    
    $imagePath = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $uploadedPath = saveUploadedFile($_FILES['image']);
        if ($uploadedPath) $imagePath = $uploadedPath;
    } elseif (!empty($imageUrl)) {
        $imagePath = $imageUrl;
    }
    
    if (!$imagePath) {
        $stmt = $pdo->prepare("SELECT image FROM inventory WHERE id = ?");
        $stmt->execute([$id]);
        $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);
        $imagePath = $currentItem['image'] ?? '';
    }
    
    try {
        $sql = "UPDATE inventory SET 
                    name = ?, brand = ?, category = ?, type = ?, price = ?, image = ? 
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$name, $brand, $category, $type, $price, $imagePath, $id]);
        
        $response['success'] = true;
        $response['message'] = 'Product updated successfully';
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>