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
    $id = isset($data->id) ? $data->id : 0;
    
    if (empty($id)) {
        $response['message'] = 'Transaction ID is required';
        echo json_encode($response);
        exit();
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get transaction details before deleting
        $getStmt = $pdo->prepare("SELECT inventory_id, quantity FROM parts_transactions WHERE id = ?");
        $getStmt->execute([$id]);
        $transaction = $getStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$transaction) {
            throw new Exception('Transaction not found');
        }
        
        // Delete the transaction
        $deleteStmt = $pdo->prepare("DELETE FROM parts_transactions WHERE id = ?");
        $deleteStmt->execute([$id]);
        
        // Restore inventory quantity
        $updateStockQuery = "UPDATE inventory 
                            SET quantity = quantity + :quantity, 
                                stock = stock + :quantity 
                            WHERE id = :inventory_id";
        $updateStockStmt = $pdo->prepare($updateStockQuery);
        $updateStockStmt->bindParam(':quantity', $transaction['quantity']);
        $updateStockStmt->bindParam(':inventory_id', $transaction['inventory_id']);
        $updateStockStmt->execute();
        
        $pdo->commit();
        
        $response['success'] = true;
        $response['message'] = 'Parts transaction deleted successfully';
        
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log('PDO Error in delete-parts-transaction: ' . $e->getMessage());
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $response['message'] = $e->getMessage();
        error_log('Exception in delete-parts-transaction: ' . $e->getMessage());
    }
}

echo json_encode($response);
?>