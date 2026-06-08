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

$response = ['success' => false, 'message' => '', 'transaction' => null];

// Check both GET and POST for id
$id = isset($_GET['id']) ? $_GET['id'] : (isset($_POST['id']) ? $_POST['id'] : null);

if (!$id) {
    $response['message'] = 'Transaction ID is required';
    echo json_encode($response);
    exit();
}

try {
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
                i.type as product_type,
                i.image,
                u.id as unit_id,
                u.engine_number,
                u.chassis_number,
                u.color,
                u.selling_price as unit_price,
                COALESCE(
                    (SELECT SUM(ip.amount_paid) FROM installment_payments ip WHERE ip.transaction_id = t.id AND ip.status = 'Paid'),
                    0
                ) as total_paid
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN inventory i ON t.inventory_id = i.id
            LEFT JOIN inventory_units u ON t.unit_id = u.id
            WHERE t.id = :id";
    
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    
    $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($transaction) {
        // Calculate remaining balance
        $total_selling_price = floatval($transaction['selling_price']);
        $down_payment = floatval($transaction['down_payment']);
        $total_paid = floatval($transaction['total_paid']);
        
        // Remaining balance = Selling Price - Down Payment - Total Paid
        $remaining_balance = $total_selling_price - $down_payment - $total_paid;
        
        $transaction['remaining_balance'] = max(0, $remaining_balance);
        $transaction['total_paid_installments'] = $total_paid;
        
        $response['success'] = true;
        $response['transaction'] = $transaction;
    } else {
        $response['message'] = 'Transaction not found';
    }
    
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
    error_log('PDO Error: ' . $e->getMessage());
}

echo json_encode($response);
?>