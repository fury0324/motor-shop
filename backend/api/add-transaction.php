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

$response = ['success' => false, 'message' => ''];

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    $response['message'] = 'No data received';
    echo json_encode($response);
    exit();
}

// Validate required fields
$required_fields = ['customer_id', 'inventory_id', 'unit_id', 'payment_type', 'selling_price', 'transaction_date'];
foreach ($required_fields as $field) {
    if (!isset($data->$field) || empty($data->$field)) {
        $response['message'] = 'Missing required field: ' . $field;
        echo json_encode($response);
        exit();
    }
}

try {
    $pdo->beginTransaction();
    
    // Generate transaction number
    $transaction_no = generateTransactionNo($pdo);
    
    // Set default values for optional fields
    $amount_paid = isset($data->amount_paid) ? $data->amount_paid : 0;
    $down_payment = isset($data->down_payment) ? $data->down_payment : 0;
    $terms = isset($data->terms) ? $data->terms : null;
    $monthly_amount = isset($data->monthly_amount) ? $data->monthly_amount : null;
    $balance = isset($data->balance) ? $data->balance : 0;
    $notes = isset($data->notes) ? $data->notes : '';
    
    // Calculate remaining balance (for installment)
    $remaining_balance = 0;
    if ($data->payment_type === 'Installment') {
        $remaining_balance = $data->selling_price - $down_payment;
    }
    
    // Prepare transaction query
    $query = "INSERT INTO transactions 
              (transaction_no, customer_id, inventory_id, unit_id, payment_type, 
               selling_price, amount_paid, down_payment, terms, monthly_amount, 
               balance, transaction_date, notes, status, created_at, remaining_balance) 
              VALUES 
              (:transaction_no, :customer_id, :inventory_id, :unit_id, :payment_type,
               :selling_price, :amount_paid, :down_payment, :terms, :monthly_amount,
               :balance, :transaction_date, :notes, 'Completed', NOW(), :remaining_balance)";
    
    $stmt = $pdo->prepare($query);
    
    // Bind parameters
    $stmt->bindParam(':transaction_no', $transaction_no);
    $stmt->bindParam(':customer_id', $data->customer_id);
    $stmt->bindParam(':inventory_id', $data->inventory_id);
    $stmt->bindParam(':unit_id', $data->unit_id);
    $stmt->bindParam(':payment_type', $data->payment_type);
    $stmt->bindParam(':selling_price', $data->selling_price);
    $stmt->bindParam(':amount_paid', $amount_paid);
    $stmt->bindParam(':down_payment', $down_payment);
    $stmt->bindParam(':terms', $terms);
    $stmt->bindParam(':monthly_amount', $monthly_amount);
    $stmt->bindParam(':balance', $balance);
    $stmt->bindParam(':transaction_date', $data->transaction_date);
    $stmt->bindParam(':notes', $notes);
    $stmt->bindParam(':remaining_balance', $remaining_balance);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to insert transaction");
    }
    
    // Get the inserted transaction ID
    $transaction_id = $pdo->lastInsertId();
    
    // Generate installment payment schedule if payment type is Installment
    if ($data->payment_type === 'Installment' && $terms > 0 && $monthly_amount > 0) {
        $start_date = new DateTime($data->transaction_date);
        
        // Prepare the insert statement once outside the loop
        $insertPaymentQuery = "INSERT INTO installment_payments 
                               (transaction_id, payment_no, due_date, amount_due, status) 
                               VALUES (:transaction_id, :payment_no, :due_date, :amount_due, 'Pending')";
        $paymentStmt = $pdo->prepare($insertPaymentQuery);
        
        for ($i = 1; $i <= $terms; $i++) {
            $due_date = clone $start_date;
            $due_date->modify("+$i months");
            
            $amount_due = $monthly_amount;
            
            // For the last payment, adjust to match exact remaining balance
            if ($i == $terms) {
                $previous_total = $monthly_amount * ($terms - 1);
                $amount_due = $remaining_balance - $previous_total;
                if ($amount_due <= 0.01) { // Allow small rounding error
                    $amount_due = $monthly_amount;
                }
                $amount_due = round($amount_due, 2);
            } else {
                $amount_due = round($monthly_amount, 2);
            }
            
            // Use bindValue instead of bindParam for values that change in loop
            $paymentStmt->bindValue(':transaction_id', $transaction_id);
            $paymentStmt->bindValue(':payment_no', $i);
            $paymentStmt->bindValue(':due_date', $due_date->format('Y-m-d'));
            $paymentStmt->bindValue(':amount_due', $amount_due);
            
            if (!$paymentStmt->execute()) {
                throw new Exception("Failed to generate payment schedule for payment #$i");
            }
        }
        
        // Set next due date (first payment due date)
        $first_due_date = clone $start_date;
        $first_due_date->modify("+1 months");
        $updateNextDueQuery = "UPDATE transactions SET next_due_date = :next_due_date WHERE id = :transaction_id";
        $nextDueStmt = $pdo->prepare($updateNextDueQuery);
        $next_due_date_str = $first_due_date->format('Y-m-d');
        $nextDueStmt->bindParam(':next_due_date', $next_due_date_str);
        $nextDueStmt->bindParam(':transaction_id', $transaction_id);
        $nextDueStmt->execute();
    }
    
    // Update unit status to 'Sold'
    $updateUnitQuery = "UPDATE inventory_units SET unit_status = 'Sold' WHERE id = :unit_id";
    $updateUnitStmt = $pdo->prepare($updateUnitQuery);
    $updateUnitStmt->bindParam(':unit_id', $data->unit_id);
    
    if (!$updateUnitStmt->execute()) {
        throw new Exception("Failed to update unit status");
    }
    
    // Update inventory stock (decrease by 1)
    $updateStockQuery = "UPDATE inventory SET stock = stock - 1 WHERE id = :inventory_id AND stock > 0";
    $updateStockStmt = $pdo->prepare($updateStockQuery);
    $updateStockStmt->bindParam(':inventory_id', $data->inventory_id);
    
    if (!$updateStockStmt->execute()) {
        throw new Exception("Failed to update inventory stock");
    }
    
    $pdo->commit();
    
    $response['success'] = true;
    $response['transaction_no'] = $transaction_no;
    $response['transaction_id'] = $transaction_id;
    $response['remaining_balance'] = $remaining_balance;
    $response['message'] = 'Transaction processed successfully';
    if ($data->payment_type === 'Installment') {
        $response['message'] .= ' Payment schedule generated for ' . $terms . ' months.';
    }
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response['message'] = 'Database error: ' . $e->getMessage();
    error_log('PDO Error: ' . $e->getMessage());
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response['message'] = $e->getMessage();
    error_log('Exception: ' . $e->getMessage());
}

echo json_encode($response);

function generateTransactionNo($pdo) {
    $year = date('Y');
    $month = date('m');
    
    $query = "SELECT COUNT(*) as count FROM transactions WHERE YEAR(created_at) = :year AND MONTH(created_at) = :month";
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':year', $year);
    $stmt->bindParam(':month', $month);
    $stmt->execute();
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $count = $result['count'] + 1;
    
    return 'TRX-' . $year . $month . '-' . str_pad($count, 5, '0', STR_PAD_LEFT);
}
?>