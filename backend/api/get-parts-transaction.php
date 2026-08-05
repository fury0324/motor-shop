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

$response = ['success' => false, 'message' => '', 'transaction' => null];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $transaction_no = isset($_GET['transaction_no']) ? $_GET['transaction_no'] : '';
    
    if (empty($id) && empty($transaction_no)) {
        $response['message'] = 'Transaction ID or Transaction No is required';
        echo json_encode($response);
        exit();
    }
    
    try {
        $sql = "SELECT 
                    pt.id,
                    pt.transaction_no,
                    pt.customer_name,
                    pt.inventory_id,
                    i.name AS part_name,
                    i.sku AS part_sku,
                    i.image,
                    i.price AS part_price,
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
                WHERE pt.id = ? OR pt.transaction_no = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id, $transaction_no]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($transaction) {
            $response['success'] = true;
            $response['transaction'] = $transaction;
        } else {
            $response['message'] = 'Transaction not found';
        }
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log('PDO Error in get-parts-transaction: ' . $e->getMessage());
    }
}

echo json_encode($response);
?>