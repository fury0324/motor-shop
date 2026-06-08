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
    $fullName = $_POST['full_name'] ?? '';
    $contactNumber = $_POST['contact_number'] ?? '';
    $email = $_POST['email'] ?? '';
    $homeAddress = $_POST['home_address'] ?? '';
    $birthDate = $_POST['birth_date'] ?? null;
    $civilStatus = $_POST['civil_status'] ?? '';
    $occupation = $_POST['occupation'] ?? '';
    $monthlyIncome = $_POST['monthly_income'] ?? 0;
    
    if (empty($id) || empty($fullName) || empty($contactNumber) || empty($email) || empty($homeAddress)) {
        $response['message'] = 'Missing required fields';
        echo json_encode($response);
        exit();
    }
    
    try {
        $sql = "UPDATE customers SET 
                    full_name = ?,
                    contact_number = ?,
                    email = ?,
                    home_address = ?,
                    birth_date = ?,
                    civil_status = ?,
                    occupation = ?,
                    monthly_income = ?,
                    updated_at = NOW()
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $fullName, $contactNumber, $email, $homeAddress,
            $birthDate, $civilStatus, $occupation, $monthlyIncome, $id
        ]);
        
        $response['success'] = true;
        $response['message'] = 'Customer updated successfully';
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>