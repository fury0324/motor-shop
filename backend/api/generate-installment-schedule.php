<?php
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->transaction_id)) {
    echo json_encode(['success' => false, 'message' => 'Transaction ID required']);
    exit();
}

try {
    $pdo->beginTransaction();
    
    // Get transaction details
    $stmt = $pdo->prepare("SELECT * FROM transactions WHERE id = ? AND payment_type = 'Installment'");
    $stmt->execute([$data->transaction_id]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        throw new Exception('Transaction not found or not an installment');
    }
    
    $remaining_balance = $transaction->balance;
    $monthly_amount = $transaction->monthly_amount;
    $terms = $transaction->terms;
    $start_date = new DateTime($transaction->transaction_date);
    
    // Generate payment schedule
    for ($i = 1; $i <= $terms; $i++) {
        $due_date = clone $start_date;
        $due_date->modify("+$i months");
        
        $amount_due = $monthly_amount;
        if ($i == $terms) {
            // Last payment includes any remaining balance due to rounding
            $amount_due = $remaining_balance;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO installment_payments 
            (transaction_id, payment_no, due_date, amount_due, status) 
            VALUES (?, ?, ?, ?, 'Pending')
        ");
        $stmt->execute([$transaction->id, $i, $due_date->format('Y-m-d'), $amount_due]);
    }
    
    // Update transaction with next due date
    $next_due_date = clone $start_date;
    $next_due_date->modify("+1 months");
    
    $stmt = $pdo->prepare("
        UPDATE transactions 
        SET remaining_balance = ?, next_due_date = ? 
        WHERE id = ?
    ");
    $stmt->execute([$remaining_balance, $next_due_date->format('Y-m-d'), $transaction->id]);
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'Payment schedule generated']);
    
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>