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

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    $ids = isset($data->ids) ? $data->ids : [];
    
    if (empty($ids)) {
        $response['message'] = 'No transaction IDs provided';
        echo json_encode($response);
        exit();
    }
    
    if (!is_array($ids)) {
        $response['message'] = 'Invalid data format';
        echo json_encode($response);
        exit();
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get all transactions before deleting
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $getStmt = $pdo->prepare("SELECT id, inventory_id, quantity FROM parts_transactions WHERE id IN ($placeholders)");
        $getStmt->execute($ids);
        $transactions = $getStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($transactions)) {
            throw new Exception('No transactions found');
        }
        
        // Delete the transactions
        $deleteStmt = $pdo->prepare("DELETE FROM parts_transactions WHERE id IN ($placeholders)");
        $deleteStmt->execute($ids);
        
        // Restore inventory quantities
        foreach ($transactions as $transaction) {
            $updateStockQuery = "UPDATE inventory 
                                SET quantity = quantity + :quantity, 
                                    stock = stock + :quantity 
                                WHERE id = :inventory_id";
            $updateStockStmt = $pdo->prepare($updateStockQuery);
            $updateStockStmt->bindParam(':quantity', $transaction['quantity']);
            $updateStockStmt->bindParam(':inventory_id', $transaction['inventory_id']);
            $updateStockStmt->execute();
        }
        
        $pdo->commit();
        
        $response['success'] = true;
        $response['message'] = count($transactions) . ' parts transaction(s) deleted successfully';
        
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log('PDO Error in bulk-delete-parts-transactions: ' . $e->getMessage());
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $response['message'] = $e->getMessage();
        error_log('Exception in bulk-delete-parts-transactions: ' . $e->getMessage());
    }
}

echo json_encode($response);
?>