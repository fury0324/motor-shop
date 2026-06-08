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

if (!isset($data->payment_id) && !isset($data->transaction_id)) {
    echo json_encode(['success' => false, 'message' => 'Payment ID or Transaction ID required']);
    exit();
}

try {
    $pdo->beginTransaction();
    
    if (isset($data->payment_id)) {
        // Record payment for a specific installment
        $stmt = $pdo->prepare("
            UPDATE installment_payments 
            SET amount_paid = ?, payment_date = ?, status = 'Paid', 
                payment_method = ?, reference_no = ?, notes = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $data->amount_paid,
            $data->payment_date,
            $data->payment_method,
            $data->reference_no,
            $data->notes,
            $data->payment_id
        ]);
        
        // Get payment details to update transaction
        $stmt = $pdo->prepare("
            SELECT ip.*, t.id as transaction_id, t.remaining_balance 
            FROM installment_payments ip
            JOIN transactions t ON ip.transaction_id = t.id
            WHERE ip.id = ?
        ");
        $stmt->execute([$data->payment_id]);
        $payment = $stmt->fetch();
        
        // Update remaining balance
        $new_balance = $payment['remaining_balance'] - $data->amount_paid;
        $stmt = $pdo->prepare("UPDATE transactions SET remaining_balance = ? WHERE id = ?");
        $stmt->execute([max(0, $new_balance), $payment['transaction_id']]);
        
    } else {
        // Bulk payment or partial payment
        $stmt = $pdo->prepare("SELECT * FROM transactions WHERE id = ?");
        $stmt->execute([$data->transaction_id]);
        $transaction = $stmt->fetch();
        
        $amount_paid = $data->amount_paid;
        $remaining_balance = $transaction['remaining_balance'] - $amount_paid;
        
        // Update the earliest pending payment
        $stmt = $pdo->prepare("
            SELECT * FROM installment_payments 
            WHERE transaction_id = ? AND status = 'Pending' 
            ORDER BY payment_no ASC 
            LIMIT 1
        ");
        $stmt->execute([$data->transaction_id]);
        $current_payment = $stmt->fetch();
        
        if ($current_payment) {
            $stmt = $pdo->prepare("
                UPDATE installment_payments 
                SET amount_paid = ?, payment_date = ?, status = 'Paid',
                    payment_method = ?, reference_no = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $current_payment['amount_due'],
                $data->payment_date,
                $data->payment_method,
                $data->reference_no,
                $current_payment['id']
            ]);
        }
        
        $stmt = $pdo->prepare("
            UPDATE transactions 
            SET remaining_balance = ?, last_payment_date = ?
            WHERE id = ?
        ");
        $stmt->execute([max(0, $remaining_balance), $data->payment_date, $data->transaction_id]);
    }
    
    // Update next due date
    $stmt = $pdo->prepare("
        SELECT MIN(due_date) as next_due 
        FROM installment_payments 
        WHERE transaction_id = ? AND status = 'Pending'
    ");
    $stmt->execute([$data->transaction_id ?? $payment['transaction_id']]);
    $next_due = $stmt->fetch();
    
    if ($next_due && $next_due['next_due']) {
        $stmt = $pdo->prepare("UPDATE transactions SET next_due_date = ? WHERE id = ?");
        $stmt->execute([$next_due['next_due'], $data->transaction_id ?? $payment['transaction_id']]);
    }
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'Payment recorded successfully']);
    
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>