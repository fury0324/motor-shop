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

$response = ['success' => false, 'message' => '', 'customers' => []];

$id = $_GET['id'] ?? '';
$search = $_GET['search'] ?? '';

if (!empty($id)) {
    // Get single customer with added_by fields
    try {
        $stmt = $pdo->prepare("
            SELECT id, full_name, contact_number, email, home_address, 
                   birth_date, civil_status, occupation, monthly_income,
                   valid_id_path, barangay_clearance_path, utility_receipt_path, proof_of_income_path,
                   co_maker_name, co_maker_contact, co_maker_relationship, co_maker_address, co_maker_id_path,
                   added_by_name, added_by_role,
                   created_at,
                   updated_at,
                   DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at_formatted,
                   DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_formatted
            FROM customers 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $customer = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($customer) {
            $response['success'] = true;
            $response['customer'] = $customer;
        } else {
            $response['message'] = 'Customer not found';
        }
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log('Error in get-customers.php: ' . $e->getMessage());
    }
} else {
    // Get all customers with added_by fields
    try {
        $sql = "SELECT id, full_name, contact_number, email, 
                       added_by_name, added_by_role,
                       DATE_FORMAT(created_at, '%Y-%m-%d') as registration_date
                FROM customers";
        
        $params = [];
        
        if (!empty($search)) {
            $sql .= " WHERE full_name LIKE :search 
                      OR email LIKE :search 
                      OR contact_number LIKE :search";
            $params[':search'] = "%$search%";
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $response['success'] = true;
        $response['customers'] = $customers;
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log('Error in get-customers.php: ' . $e->getMessage());
    }
}

echo json_encode($response);
?>