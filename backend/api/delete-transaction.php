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

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id)) {
    $response['message'] = 'Transaction ID is required';
    echo json_encode($response);
    exit();
}

try {
    $pdo->beginTransaction();
    
    // Get the unit_id and inventory_id from the transaction
    $stmt = $pdo->prepare("SELECT unit_id, inventory_id FROM transactions WHERE id = ?");
    $stmt->execute([$data->id]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        throw new Exception('Transaction not found');
    }
    
    // Delete installment payments first (due to foreign key constraint)
    $stmt = $pdo->prepare("DELETE FROM installment_payments WHERE transaction_id = ?");
    $stmt->execute([$data->id]);
    
    // Delete the transaction
    $stmt = $pdo->prepare("DELETE FROM transactions WHERE id = ?");
    $stmt->execute([$data->id]);
    
    // Update unit status back to 'Available'
    $stmt = $pdo->prepare("UPDATE inventory_units SET unit_status = 'Available' WHERE id = ?");
    $stmt->execute([$transaction['unit_id']]);
    
    // Increase inventory stock back
    $stmt = $pdo->prepare("UPDATE inventory SET stock = stock + 1 WHERE id = ?");
    $stmt->execute([$transaction['inventory_id']]);
    
    $pdo->commit();
    
    $response['success'] = true;
    $response['message'] = 'Transaction deleted successfully';
    
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
?>