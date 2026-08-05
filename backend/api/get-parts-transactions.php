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

$response = ['success' => false, 'message' => '', 'transactions' => []];

try {
    // Build query with filters
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
    $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
    
    $sql = "SELECT 
                pt.id,
                pt.transaction_no,
                pt.customer_name,
                pt.inventory_id,
                i.name AS part_name,
                i.sku AS part_sku,
                i.image,
                pt.quantity,
                pt.price,
                pt.total_amount,
                pt.amount_paid,
                pt.change_amount,
                pt.payment_type,
                pt.transaction_date,
                pt.notes,
                pt.status,
                pt.processed_by_name,
                pt.processed_by_role,
                pt.created_at,
                pt.updated_at
            FROM parts_transactions pt
            LEFT JOIN inventory i ON pt.inventory_id = i.id
            WHERE 1=1";
    
    $params = [];
    
    if (!empty($search)) {
        $sql .= " AND (pt.transaction_no LIKE ? OR pt.customer_name LIKE ? OR i.name LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    if (!empty($date_from)) {
        $sql .= " AND DATE(pt.transaction_date) >= ?";
        $params[] = $date_from;
    }
    
    if (!empty($date_to)) {
        $sql .= " AND DATE(pt.transaction_date) <= ?";
        $params[] = $date_to;
    }
    
    $sql .= " ORDER BY pt.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response['success'] = true;
    $response['transactions'] = $transactions;
    $response['count'] = count($transactions);
    
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
    error_log('PDO Error in get-parts-transactions: ' . $e->getMessage());
}

echo json_encode($response);
?>