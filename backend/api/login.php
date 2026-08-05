<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

$response = ['success' => false, 'message' => ''];

ini_set('session.cookie_samesite', 'None');
ini_set('session.cookie_secure', 'false');
session_set_cookie_params([
    'lifetime' => 3600,
    'path' => '/',
    'domain' => 'localhost',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'None'
]);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if ($data) {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
    } else {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
    }
    
    if (empty($email) || empty($password)) {
        $response['message'] = 'Email and password are required';
        echo json_encode($response);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND status = 'active'");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // ✅ DEBUG: Log the role from database
            error_log("🔍 User role from database: " . $user['role']);
            
            if (password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_name'] = $user['name'];
                $_SESSION['user_role'] = $user['role'];
                
                $response['success'] = true;
                $response['message'] = 'Login successful';
                $response['user'] = [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'name' => $user['name'],
                    'role' => $user['role']  // ✅ This should be 'staff'
                ];
            } else {
                $response['message'] = 'Invalid password';
            }
        } else {
            $response['message'] = 'User not found';
        }
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log('Login error: ' . $e->getMessage());
    }
}

echo json_encode($response);
?>