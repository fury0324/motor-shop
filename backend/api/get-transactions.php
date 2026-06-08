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

$response = ['success' => false, 'message' => '', 'transactions' => [], 'summary' => []];

try {
    // Get filters
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    $payment_type = isset($_GET['payment_type']) ? $_GET['payment_type'] : '';
    $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
    $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
    
    $query = "SELECT 
                t.*,
                c.id as customer_id,
                c.full_name as customer_name,
                c.email,
                c.contact_number,
                c.home_address,
                i.id as inventory_id,
                i.name as product_name,
                i.brand,
                i.image,
                u.id as unit_id,
                u.engine_number,
                u.chassis_number,
                u.color,
                COALESCE(
                    (SELECT SUM(ip.amount_paid) FROM installment_payments ip WHERE ip.transaction_id = t.id AND ip.status = 'Paid'),
                    0
                ) as total_paid_installments
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN inventory i ON t.inventory_id = i.id
            LEFT JOIN inventory_units u ON t.unit_id = u.id
            WHERE 1=1";
    
    $params = [];
    
    if (!empty($search)) {
        $query .= " AND (t.transaction_no LIKE :search OR c.full_name LIKE :search OR i.name LIKE :search)";
        $params[':search'] = "%$search%";
    }
    
    if (!empty($status)) {
        $query .= " AND t.status = :status";
        $params[':status'] = $status;
    }
    
    if (!empty($payment_type)) {
        $query .= " AND t.payment_type = :payment_type";
        $params[':payment_type'] = $payment_type;
    }
    
    if (!empty($date_from)) {
        $query .= " AND DATE(t.transaction_date) >= :date_from";
        $params[':date_from'] = $date_from;
    }
    
    if (!empty($date_to)) {
        $query .= " AND DATE(t.transaction_date) <= :date_to";
        $params[':date_to'] = $date_to;
    }
    
    $query .= " ORDER BY t.created_at DESC";
    
    $stmt = $pdo->prepare($query);
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    $stmt->execute();
    $transactions = $stmt->fetchAll();
    
    // Calculate remaining balance for each transaction
    foreach ($transactions as &$transaction) {
        if ($transaction['payment_type'] === 'Installment') {
            $total_paid = floatval($transaction['total_paid_installments']);
            $remaining = floatval($transaction['selling_price']) - floatval($transaction['down_payment']) - $total_paid;
            $transaction['balance'] = max(0, $remaining);
        }
    }
    
    $response['success'] = true;
    $response['transactions'] = $transactions;
    
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
    error_log('PDO Error: ' . $e->getMessage());
}

echo json_encode($response);
?>