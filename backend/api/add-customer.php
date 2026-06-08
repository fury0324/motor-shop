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

function saveUploadedFile($file, $prefix) {
    $targetDir = __DIR__ . '/../uploads/customers/';
    
    if (!file_exists($targetDir)) {
        mkdir($targetDir, 0777, true);
    }
    
    $fileName = time() . '_' . $prefix . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file['name']);
    $targetFile = $targetDir . $fileName;
    
    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        return 'http://localhost:8080/motor-shop/backend/uploads/customers/' . $fileName;
    }
    
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName = $_POST['fullName'] ?? '';
    $contactNumber = $_POST['contactNumber'] ?? '';
    $email = $_POST['email'] ?? '';
    $homeAddress = $_POST['homeAddress'] ?? '';
    $birthDate = $_POST['birthDate'] ?? null;
    $civilStatus = $_POST['civilStatus'] ?? '';
    $occupation = $_POST['occupation'] ?? '';
    $monthlyIncome = $_POST['monthlyIncome'] ?? 0;
    
    $coMakerName = $_POST['coMakerName'] ?? '';
    $coMakerContact = $_POST['coMakerContact'] ?? '';
    $coMakerRelationship = $_POST['coMakerRelationship'] ?? '';
    $coMakerAddress = $_POST['coMakerAddress'] ?? '';
    
    if (empty($fullName) || empty($contactNumber) || empty($email) || empty($homeAddress)) {
        $response['message'] = 'Missing required fields';
        echo json_encode($response);
        exit();
    }
    
    $validIdPath = null;
    $barangayClearancePath = null;
    $utilityReceiptPath = null;
    $proofOfIncomePath = null;
    $coMakerIdPath = null;
    
    if (isset($_FILES['validId']) && $_FILES['validId']['error'] === UPLOAD_ERR_OK) {
        $validIdPath = saveUploadedFile($_FILES['validId'], 'valid_id');
    }
    if (isset($_FILES['barangayClearance']) && $_FILES['barangayClearance']['error'] === UPLOAD_ERR_OK) {
        $barangayClearancePath = saveUploadedFile($_FILES['barangayClearance'], 'barangay');
    }
    if (isset($_FILES['utilityReceipt']) && $_FILES['utilityReceipt']['error'] === UPLOAD_ERR_OK) {
        $utilityReceiptPath = saveUploadedFile($_FILES['utilityReceipt'], 'utility');
    }
    if (isset($_FILES['proofOfIncome']) && $_FILES['proofOfIncome']['error'] === UPLOAD_ERR_OK) {
        $proofOfIncomePath = saveUploadedFile($_FILES['proofOfIncome'], 'income');
    }
    if (isset($_FILES['coMakerId']) && $_FILES['coMakerId']['error'] === UPLOAD_ERR_OK) {
        $coMakerIdPath = saveUploadedFile($_FILES['coMakerId'], 'comaker_id');
    }
    
    try {
        $pdo->beginTransaction();
        
        $sql = "INSERT INTO customers (full_name, contact_number, email, home_address, birth_date, civil_status, occupation, monthly_income,
                valid_id_path, barangay_clearance_path, utility_receipt_path, proof_of_income_path,
                co_maker_name, co_maker_contact, co_maker_relationship, co_maker_address, co_maker_id_path,
                created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $fullName, $contactNumber, $email, $homeAddress, $birthDate, $civilStatus, $occupation, $monthlyIncome,
            $validIdPath, $barangayClearancePath, $utilityReceiptPath, $proofOfIncomePath,
            $coMakerName, $coMakerContact, $coMakerRelationship, $coMakerAddress, $coMakerIdPath
        ]);
        
        $customerId = $pdo->lastInsertId();
        
        $pdo->commit();
        
        $response['success'] = true;
        $response['message'] = 'Customer registered successfully';
        $response['customer_id'] = $customerId;
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
}

echo json_encode($response);
?>