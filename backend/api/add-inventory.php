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
    $quantity = $_POST['quantity'] ?? 0;
    $isPart = isset($_POST['is_part']) ? 1 : 0;
    
    // Check if it's a part (simplified validation)
    $isPartItem = ($category === 'Part' || $isPart == 1);
    
    // Validate based on type
    if ($isPartItem) {
        // For parts: name, quantity, and price are required
        if (empty($name) || empty($price) || $quantity <= 0) {
            $response['message'] = 'Missing required fields for part. Name, quantity, and price are required.';
            echo json_encode($response);
            exit();
        }
        // Set default values for parts
        $brand = '';
        $type = 'Part';
    } else {
        // For models: all fields are required
        if (empty($name) || empty($brand) || empty($category) || empty($type) || empty($price)) {
            $response['message'] = 'Missing required fields for model.';
            echo json_encode($response);
            exit();
        }
        // Ensure category is set to Motorcycle for models
        $category = 'Motorcycle';
        $quantity = 0;
    }
    
    // Handle image upload
    $imagePath = '';
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $uploadedPath = saveUploadedFile($_FILES['image']);
        if ($uploadedPath) $imagePath = $uploadedPath;
    } elseif (!empty($imageUrl)) {
        $imagePath = $imageUrl;
    }
    
    try {
        // Prepare SQL - include quantity and is_part fields
        $sql = "INSERT INTO inventory (sku, name, brand, category, type, price, image, quantity, is_part, stock, status, statusColor) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        // Set default values
        $stock = $isPartItem ? $quantity : 0;
        $status = $isPartItem ? 'In Stock' : 'No Units';
        $statusColor = $isPartItem ? 'green' : 'gray';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $sku, 
            $name, 
            $brand, 
            $category, 
            $type, 
            $price, 
            $imagePath, 
            $quantity, 
            $isPart, 
            $stock, 
            $status, 
            $statusColor
        ]);
        
        $response['success'] = true;
        $response['message'] = $isPartItem ? 'Part added successfully' : 'Model added successfully';
        $response['id'] = $pdo->lastInsertId();
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>