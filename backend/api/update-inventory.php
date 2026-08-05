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
    $description = $_POST['description'] ?? '';
    $color = $_POST['color'] ?? '';
    $imageUrl = $_POST['image_url'] ?? '';
    $quantity = $_POST['quantity'] ?? 0;
    $is_part = isset($_POST['is_part']) ? $_POST['is_part'] : 0;
    
    if (empty($id)) {
        $response['message'] = 'Product ID is required';
        echo json_encode($response);
        exit();
    }
    
    // Handle image upload
    $imagePath = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $uploadedPath = saveUploadedFile($_FILES['image']);
        if ($uploadedPath) $imagePath = $uploadedPath;
    } elseif (!empty($imageUrl)) {
        $imagePath = $imageUrl;
    }
    
    // If no new image, keep the existing one
    if (!$imagePath) {
        $stmt = $pdo->prepare("SELECT image FROM inventory WHERE id = ?");
        $stmt->execute([$id]);
        $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);
        $imagePath = $currentItem['image'] ?? '';
    }
    
    try {
        // Check if it's a part by looking at the category or is_part flag
        $isPartItem = ($category === 'Part' || $is_part == 1);
        
        // Build update query based on type
        if ($isPartItem) {
            // For Parts: update everything including quantity
            $sql = "UPDATE inventory SET 
                        name = ?, 
                        brand = ?, 
                        category = ?, 
                        type = ?, 
                        price = ?, 
                        description = ?,
                        color = ?,
                        image = ?,
                        quantity = ?,
                        is_part = ?,
                        stock = ?,
                        status = ?,
                        statusColor = ?
                    WHERE id = ?";
            
            $params = [
                $name, 
                $brand, 
                $category, 
                $type, 
                $price, 
                $description,
                $color,
                $imagePath, 
                $quantity,
                1,
                $quantity, // stock = quantity for parts
                'In Stock',
                'green',
                $id
            ];
        } else {
            // For Models: update without quantity (or set to 0)
            $sql = "UPDATE inventory SET 
                        name = ?, 
                        brand = ?, 
                        category = ?, 
                        type = ?, 
                        price = ?, 
                        description = ?,
                        color = ?,
                        image = ?,
                        is_part = ?,
                        quantity = 0
                    WHERE id = ?";
            
            $params = [
                $name, 
                $brand, 
                $category, 
                $type, 
                $price, 
                $description,
                $color,
                $imagePath,
                0,
                $id
            ];
        }
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        
        if ($result) {
            $response['success'] = true;
            $response['message'] = $isPartItem ? 'Part updated successfully' : 'Model updated successfully';
            $response['is_part'] = $isPartItem;
            if ($isPartItem) {
                $response['quantity'] = $quantity;
            }
        } else {
            $response['message'] = 'Failed to update product';
        }
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log('PDO Error: ' . $e->getMessage());
    }
}

echo json_encode($response);
?>