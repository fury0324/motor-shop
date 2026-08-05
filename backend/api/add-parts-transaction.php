<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
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
if (!isset($data->customer_name) || empty($data->customer_name)) {
    $response['message'] = 'Customer name is required';
    echo json_encode($response);
    exit();
}

if (!isset($data->inventory_id) || empty($data->inventory_id)) {
    $response['message'] = 'Part is required';
    echo json_encode($response);
    exit();
}

if (!isset($data->amount_paid) || $data->amount_paid <= 0) {
    $response['message'] = 'Amount paid is required';
    echo json_encode($response);
    exit();
}

try {
    $pdo->beginTransaction();
    
    // Get part details and verify it's actually a part
    $partStmt = $pdo->prepare("
        SELECT id, name, price, quantity, stock 
        FROM inventory 
        WHERE id = ? AND (category = 'Part' OR is_part = 1)
    ");
    $partStmt->execute([$data->inventory_id]);
    $part = $partStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$part) {
        throw new Exception('Part not found or invalid part selected');
    }
    
    $quantity = isset($data->quantity) ? (int)$data->quantity : 1;
    
    if ($quantity <= 0) {
        throw new Exception('Quantity must be at least 1');
    }
    
    if ($part['quantity'] < $quantity) {
        throw new Exception('Insufficient stock. Available: ' . $part['quantity']);
    }
    
    // Generate transaction number
    $year = date('Y');
    $month = date('m');
    $countStmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM parts_transactions 
        WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
    ");
    $countStmt->execute([$year, $month]);
    $count = $countStmt->fetch(PDO::FETCH_ASSOC)['count'] + 1;
    $transaction_no = 'PRT-' . $year . $month . '-' . str_pad($count, 5, '0', STR_PAD_LEFT);
    
    // Calculate amounts
    $price = isset($data->price) ? (float)$data->price : (float)$part['price'];
    $total_amount = $price * $quantity;
    $amount_paid = (float)$data->amount_paid;
    $change_amount = max(0, $amount_paid - $total_amount);
    
    if ($amount_paid < $total_amount) {
        throw new Exception('Amount paid (₱' . number_format($amount_paid, 2) . ') is less than total amount (₱' . number_format($total_amount, 2) . ')');
    }
    
    // Get processed_by info
    $processed_by_name = isset($data->processed_by_name) ? $data->processed_by_name : 'System';
    $processed_by_role = isset($data->processed_by_role) ? $data->processed_by_role : 'cashier';
    $processed_by_id = isset($data->processed_by_id) ? $data->processed_by_id : null;
    $transaction_date = isset($data->transaction_date) ? $data->transaction_date : date('Y-m-d');
    $notes = isset($data->notes) ? $data->notes : '';
    $payment_type = isset($data->payment_type) ? $data->payment_type : 'Cash';
    
    // Insert parts transaction
    $query = "INSERT INTO parts_transactions 
              (transaction_no, customer_name, inventory_id, quantity, price, 
               total_amount, amount_paid, change_amount, payment_type, 
               transaction_date, notes, status, processed_by_id, 
               processed_by_name, processed_by_role, created_at) 
              VALUES 
              (:transaction_no, :customer_name, :inventory_id, :quantity, :price,
               :total_amount, :amount_paid, :change_amount, :payment_type,
               :transaction_date, :notes, 'Completed', :processed_by_id,
               :processed_by_name, :processed_by_role, NOW())";
    
    $stmt = $pdo->prepare($query);
    
    $stmt->bindParam(':transaction_no', $transaction_no);
    $stmt->bindParam(':customer_name', $data->customer_name);
    $stmt->bindParam(':inventory_id', $data->inventory_id);
    $stmt->bindParam(':quantity', $quantity);
    $stmt->bindParam(':price', $price);
    $stmt->bindParam(':total_amount', $total_amount);
    $stmt->bindParam(':amount_paid', $amount_paid);
    $stmt->bindParam(':change_amount', $change_amount);
    $stmt->bindParam(':payment_type', $payment_type);
    $stmt->bindParam(':transaction_date', $transaction_date);
    $stmt->bindParam(':notes', $notes);
    $stmt->bindParam(':processed_by_id', $processed_by_id);
    $stmt->bindParam(':processed_by_name', $processed_by_name);
    $stmt->bindParam(':processed_by_role', $processed_by_role);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to insert parts transaction");
    }
    
    $transaction_id = $pdo->lastInsertId();
    
    // Update inventory quantity for parts
    $updateStockQuery = "UPDATE inventory 
                        SET quantity = quantity - :quantity, 
                            stock = stock - :quantity 
                        WHERE id = :inventory_id AND quantity >= :quantity";
    $updateStockStmt = $pdo->prepare($updateStockQuery);
    $updateStockStmt->bindParam(':quantity', $quantity);
    $updateStockStmt->bindParam(':inventory_id', $data->inventory_id);
    
    if (!$updateStockStmt->execute()) {
        throw new Exception("Failed to update inventory stock");
    }
    
    // Check if update actually happened
    if ($updateStockStmt->rowCount() == 0) {
        throw new Exception("Failed to update inventory. Stock may have been updated by another process.");
    }
    
    $pdo->commit();
    
    // Prepare success response
    $response['success'] = true;
    $response['message'] = 'Parts transaction completed successfully';
    $response['transaction_no'] = $transaction_no;
    $response['transaction_id'] = $transaction_id;
    $response['total_amount'] = number_format($total_amount, 2);
    $response['amount_paid'] = number_format($amount_paid, 2);
    $response['change_amount'] = number_format($change_amount, 2);
    $response['customer_name'] = $data->customer_name;
    $response['part_name'] = $part['name'];
    $response['quantity'] = $quantity;
    $response['new_stock'] = $part['quantity'] - $quantity;
    
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response['message'] = 'Database error: ' . $e->getMessage();
    error_log('PDO Error in add-parts-transaction: ' . $e->getMessage());
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response['message'] = $e->getMessage();
    error_log('Exception in add-parts-transaction: ' . $e->getMessage());
}

echo json_encode($response);
?>