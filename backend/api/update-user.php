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
    $email = $_POST['email'] ?? '';
    $role = $_POST['role'] ?? '';
    $status = $_POST['status'] ?? '';
    
    if (empty($id)) {
        $response['message'] = 'User ID is required';
        echo json_encode($response);
        exit();
    }
    
    try {
        $updates = [];
        $params = [];
        
        if (!empty($name)) {
            $updates[] = "name = ?";
            $params[] = $name;
        }
        if (!empty($email)) {
            $updates[] = "email = ?";
            $params[] = $email;
        }
        if (!empty($role)) {
            $updates[] = "role = ?";
            $params[] = $role;
        }
        if (!empty($status)) {
            $updates[] = "status = ?";
            $params[] = $status;
        }
        
        if (empty($updates)) {
            $response['message'] = 'No fields to update';
            echo json_encode($response);
            exit();
        }
        
        $params[] = $id;
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $response['success'] = true;
        $response['message'] = 'User updated successfully';
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>