<?php
// backend/api/get-all-inventory-units.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/database.php';

try {
    // Kunin ang lahat ng units mula sa inventory_units
    $query = "
        SELECT 
            iu.*,
            i.name as model_name,
            i.sku
        FROM inventory_units iu
        LEFT JOIN inventory i ON iu.inventory_id = i.id
        ORDER BY iu.id DESC
    ";
    
    $stmt = $pdo->query($query);
    $units = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'units' => $units,
        'total' => count($units)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>