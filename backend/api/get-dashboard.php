<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

$response = ['success' => false, 'message' => ''];

try {
    // Get total customers
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM customers");
    $totalCustomers = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get total transactions
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM transactions");
    $totalTransactions = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get total revenue (sum of selling_price)
    $stmt = $pdo->query("SELECT COALESCE(SUM(selling_price), 0) as total FROM transactions WHERE status = 'Completed'");
    $totalRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get total users
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM users WHERE status = 'active'");
    $totalUsers = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get recent transactions with customer and product info
    $stmt = $pdo->prepare("
        SELECT 
            t.id,
            t.transaction_no,
            t.transaction_date,
            t.selling_price,
            t.payment_type,
            t.status,
            t.created_at,
            c.full_name as customer_name,
            c.contact_number,
            i.name as product_name,
            i.brand,
            u.engine_number,
            u.chassis_number
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN inventory i ON t.inventory_id = i.id
        LEFT JOIN inventory_units u ON t.unit_id = u.id
        ORDER BY t.id DESC
        LIMIT 10
    ");
    $stmt->execute();
    $recentTransactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get low stock items (inventory with stock <= 5)
    $stmt = $pdo->query("
        SELECT 
            id,
            name,
            brand,
            stock,
            price,
            category,
            status
        FROM inventory 
        WHERE stock <= 5 AND status = 'In Stock'
        ORDER BY stock ASC
        LIMIT 5
    ");
    $lowStockItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get recent customers
    $stmt = $pdo->query("
        SELECT 
            id,
            full_name,
            email,
            contact_number,
            created_at
        FROM customers 
        ORDER BY id DESC 
        LIMIT 5
    ");
    $recentCustomers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get monthly revenue (last 6 months)
    $stmt = $pdo->prepare("
        SELECT 
            DATE_FORMAT(transaction_date, '%Y-%m') as month,
            COALESCE(SUM(selling_price), 0) as revenue,
            COUNT(*) as transactions_count
        FROM transactions 
        WHERE status = 'Completed' 
            AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
        ORDER BY month ASC
    ");
    $stmt->execute();
    $monthlyRevenue = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get transaction status counts
    $stmt = $pdo->query("
        SELECT 
            status,
            COUNT(*) as count
        FROM transactions
        GROUP BY status
    ");
    $statusCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get payment type counts
    $stmt = $pdo->query("
        SELECT 
            payment_type,
            COUNT(*) as count
        FROM transactions
        GROUP BY payment_type
    ");
    $paymentTypeCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate AI Score based on various metrics
    $aiScore = 94; // Default
    if ($totalTransactions > 0) {
        // Calculate based on success rate
        $completedCount = 0;
        foreach ($statusCounts as $status) {
            if ($status['status'] === 'Completed') {
                $completedCount = $status['count'];
            }
        }
        $successRate = ($totalTransactions > 0) ? ($completedCount / $totalTransactions) * 100 : 0;
        $aiScore = min(round(70 + ($successRate * 0.3)), 98);
    }

    $response['success'] = true;
    $response['total_customers'] = (int)$totalCustomers;
    $response['total_transactions'] = (int)$totalTransactions;
    $response['total_revenue'] = (float)$totalRevenue;
    $response['total_users'] = (int)$totalUsers;
    $response['ai_score'] = $aiScore;
    $response['recent_transactions'] = $recentTransactions;
    $response['low_stock_items'] = $lowStockItems;
    $response['recent_customers'] = $recentCustomers;
    $response['monthly_revenue'] = $monthlyRevenue;
    $response['status_counts'] = $statusCounts;
    $response['payment_type_counts'] = $paymentTypeCounts;

} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
    error_log('PDO Error: ' . $e->getMessage());
}

echo json_encode($response);
?>