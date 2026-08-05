<?php
// backend/api/predictive-analysis-data.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// ============ DATABASE CONNECTION (PDO) ============
require_once '../config/database.php';

// Check if $pdo exists
if (!isset($pdo)) {
    echo json_encode([
        'success' => false,
        'error' => 'Database connection not established'
    ]);
    exit;
}

// ============ PREDICTIVE DATA COLLECTOR ============
class PredictiveDataCollector {
    private $pdo;
    private $data = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function collectAllData() {
        $this->data = [
            'collected_at' => date('Y-m-d H:i:s'),
            'motorcycle_sales' => $this->getMotorcycleSales(),
            'parts_sales' => $this->getPartsSales(),
            'inventory_status' => $this->getInventoryStatus(),
            'low_stock_alerts' => $this->getLowStockAlerts(),
            'customer_analysis' => $this->getCustomerAnalysis(),
            'payment_performance' => $this->getPaymentPerformance(),
            'seasonal_patterns' => $this->getSeasonalPatterns(),
            'daily_patterns' => $this->getDailyPatterns(),
            'top_products' => $this->getTopProducts(),
            'next_month_prediction' => $this->predictNextMonthRevenue(),
            'top_products_prediction' => $this->predictTopProductsNextMonth(),
            'summary' => []
        ];
        
        $this->data['summary'] = $this->calculateSummary();
        
        return $this->data;
    }
    
    private function getMotorcycleSales() {
        $query = "
            SELECT 
                DATE_FORMAT(transaction_date, '%Y-%m') as month,
                COUNT(*) as total_transactions,
                SUM(selling_price) as total_revenue,
                ROUND(AVG(selling_price), 2) as avg_transaction_value,
                COUNT(DISTINCT customer_id) as unique_customers,
                SUM(CASE WHEN payment_type = 'Cash' THEN 1 ELSE 0 END) as cash_transactions,
                SUM(CASE WHEN payment_type = 'Installment' THEN 1 ELSE 0 END) as installment_transactions
            FROM transactions
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                AND status = 'Completed'
            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
            ORDER BY month ASC
        ";
        
        $stmt = $this->pdo->query($query);
        return $stmt->fetchAll();
    }
    
    private function getPartsSales() {
        $query = "
            SELECT 
                DATE_FORMAT(transaction_date, '%Y-%m') as month,
                COUNT(*) as total_transactions,
                SUM(total_amount) as total_revenue,
                SUM(quantity) as total_units_sold,
                ROUND(AVG(total_amount), 2) as avg_transaction_value,
                COUNT(DISTINCT customer_name) as unique_customers
            FROM parts_transactions
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                AND status = 'Completed'
            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
            ORDER BY month ASC
        ";
        
        $stmt = $this->pdo->query($query);
        return $stmt->fetchAll();
    }
    
    private function getInventoryStatus() {
        $query = "
            SELECT 
                id,
                name,
                sku,
                category,
                is_part,
                quantity as current_stock,
                price,
                CASE 
                    WHEN is_part = 1 THEN 'Part'
                    ELSE 'Motorcycle'
                END as item_type,
                image,
                status
            FROM inventory
            ORDER BY is_part DESC, name ASC
        ";
        
        $stmt = $this->pdo->query($query);
        $data = $stmt->fetchAll();
        
        foreach ($data as &$row) {
            $row['current_stock'] = (int)$row['current_stock'];
        }
        
        return $data;
    }
    
    private function getLowStockAlerts() {
        $query = "
            SELECT 
                i.id,
                i.name,
                i.sku,
                i.quantity as current_stock,
                COALESCE(SUM(pt.quantity), 0) as total_sold_3months,
                COALESCE(ROUND(SUM(pt.quantity) / 3, 2), 0) as avg_monthly_sales,
                CASE 
                    WHEN COALESCE(SUM(pt.quantity), 0) > 0 
                    THEN ROUND(i.quantity / (SUM(pt.quantity) / 3), 1)
                    ELSE 999
                END as months_until_empty,
                CASE 
                    WHEN COALESCE(SUM(pt.quantity), 0) > 0 
                        AND i.quantity / (SUM(pt.quantity) / 3) < 3 
                    THEN 'Critical'
                    WHEN COALESCE(SUM(pt.quantity), 0) > 0 
                        AND i.quantity / (SUM(pt.quantity) / 3) < 6 
                    THEN 'Warning'
                    WHEN COALESCE(SUM(pt.quantity), 0) = 0 
                    THEN 'No History'
                    ELSE 'Good'
                END as alert_level,
                CASE 
                    WHEN COALESCE(SUM(pt.quantity), 0) > 0 
                        AND i.quantity / (SUM(pt.quantity) / 3) < 3 
                    THEN 'Need to reorder within 3 months'
                    WHEN COALESCE(SUM(pt.quantity), 0) > 0 
                        AND i.quantity / (SUM(pt.quantity) / 3) < 6 
                    THEN 'Monitor stock level'
                    WHEN COALESCE(SUM(pt.quantity), 0) = 0 
                    THEN 'No sales data available'
                    ELSE 'Stock is adequate'
                END as recommendation
            FROM inventory i
            LEFT JOIN parts_transactions pt ON i.id = pt.inventory_id
                AND pt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                AND pt.status = 'Completed'
            WHERE i.is_part = 1 AND i.quantity > 0
            GROUP BY i.id
            HAVING months_until_empty < 3 OR months_until_empty = 999
            ORDER BY months_until_empty ASC
        ";
        
        $stmt = $this->pdo->query($query);
        $data = $stmt->fetchAll();
        
        foreach ($data as &$row) {
            $row['current_stock'] = (int)$row['current_stock'];
            $row['total_sold_3months'] = (int)$row['total_sold_3months'];
            $row['avg_monthly_sales'] = (float)$row['avg_monthly_sales'];
            $row['months_until_empty'] = (float)$row['months_until_empty'];
        }
        
        return $data;
    }
    
    private function getCustomerAnalysis() {
        $total_query = "SELECT COUNT(*) as total FROM customers";
        $stmt = $this->pdo->query($total_query);
        $total = $stmt->fetch();
        
        $query = "
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as new_customers
            FROM customers
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ";
        
        $stmt = $this->pdo->query($query);
        $monthly = $stmt->fetchAll();
        
        $recent_query = "
            SELECT COUNT(*) as recent
            FROM customers
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ";
        $stmt = $this->pdo->query($recent_query);
        $recent = $stmt->fetch();
        
        return [
            'total_customers' => (int)$total['total'],
            'new_customers_last_30days' => (int)$recent['recent'],
            'monthly_growth' => $monthly
        ];
    }
    
    private function getPaymentPerformance() {
        $query = "
            SELECT 
                DATE_FORMAT(due_date, '%Y-%m') as month,
                COUNT(*) as total_dues,
                SUM(amount_due) as total_amount_due,
                SUM(amount_paid) as total_amount_paid,
                ROUND((SUM(amount_paid) / SUM(amount_due)) * 100, 2) as collection_rate,
                SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue_count,
                SUM(CASE WHEN status = 'Overdue' THEN amount_due ELSE 0 END) as overdue_amount
            FROM installment_payments
            WHERE due_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(due_date, '%Y-%m')
            ORDER BY month ASC
        ";
        
        $stmt = $this->pdo->query($query);
        return $stmt->fetchAll();
    }
    
    private function getSeasonalPatterns() {
        $query = "
            SELECT 
                MONTH(transaction_date) as month_num,
                MONTHNAME(transaction_date) as month_name,
                COUNT(*) as total_sales,
                SUM(selling_price) as total_revenue,
                COUNT(DISTINCT customer_id) as unique_customers,
                ROUND(AVG(selling_price), 2) as avg_sale
            FROM transactions
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
                AND status = 'Completed'
            GROUP BY MONTH(transaction_date)
            ORDER BY total_revenue DESC
            LIMIT 5
        ";
        
        $stmt = $this->pdo->query($query);
        return $stmt->fetchAll();
    }
    
    private function getDailyPatterns() {
        $query = "
            SELECT 
                DAYNAME(transaction_date) as day_of_week,
                COUNT(*) as total_transactions,
                SUM(selling_price) as total_revenue,
                ROUND(AVG(selling_price), 2) as avg_sale
            FROM transactions
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                AND status = 'Completed'
            GROUP BY DAYNAME(transaction_date)
            ORDER BY 
                FIELD(DAYNAME(transaction_date), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        ";
        
        $stmt = $this->pdo->query($query);
        $data = $stmt->fetchAll();
        
        $allDays = [
            'Monday' => ['total_transactions' => 0, 'total_revenue' => 0, 'avg_sale' => 0],
            'Tuesday' => ['total_transactions' => 0, 'total_revenue' => 0, 'avg_sale' => 0],
            'Wednesday' => ['total_transactions' => 0, 'total_revenue' => 0, 'avg_sale' => 0],
            'Thursday' => ['total_transactions' => 0, 'total_revenue' => 0, 'avg_sale' => 0],
            'Friday' => ['total_transactions' => 0, 'total_revenue' => 0, 'avg_sale' => 0],
            'Saturday' => ['total_transactions' => 0, 'total_revenue' => 0, 'avg_sale' => 0],
            'Sunday' => ['total_transactions' => 0, 'total_revenue' => 0, 'avg_sale' => 0]
        ];
        
        foreach ($data as $row) {
            $day = $row['day_of_week'];
            if (isset($allDays[$day])) {
                $allDays[$day] = [
                    'day_of_week' => $day,
                    'total_transactions' => (int)$row['total_transactions'],
                    'total_revenue' => (float)$row['total_revenue'],
                    'avg_sale' => (float)$row['avg_sale']
                ];
            }
        }
        
        $result = [];
        foreach ($allDays as $day => $values) {
            $result[] = [
                'day_of_week' => $day,
                'total_transactions' => $values['total_transactions'],
                'total_revenue' => $values['total_revenue'],
                'avg_sale' => $values['avg_sale']
            ];
        }
        
        return $result;
    }
    
    private function getTopProducts() {
        $query = "
            SELECT 
                i.name as product_name,
                i.sku,
                i.category,
                i.is_part,
                i.quantity as current_stock,
                COUNT(t.id) as times_sold,
                SUM(CASE WHEN t.payment_type = 'Cash' THEN t.selling_price ELSE 0 END) as cash_sales,
                SUM(CASE WHEN t.payment_type = 'Installment' THEN t.selling_price ELSE 0 END) as installment_sales,
                SUM(t.selling_price) as total_sales,
                i.image
            FROM inventory i
            LEFT JOIN transactions t ON i.id = t.inventory_id 
                AND t.status = 'Completed'
                AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            WHERE i.category = 'Motorcycle'
            GROUP BY i.id
            HAVING total_sales > 0 OR total_sales IS NOT NULL
            ORDER BY total_sales DESC
            LIMIT 10
        ";
        
        $stmt = $this->pdo->query($query);
        $data = $stmt->fetchAll();
        
        foreach ($data as &$row) {
            $row['current_stock'] = (int)$row['current_stock'];
            $row['times_sold'] = (int)$row['times_sold'];
        }
        
        return $data;
    }
    
    // ✅ FIXED: Check if data exists before accessing
    private function predictNextMonthRevenue() {
        $sales = isset($this->data['motorcycle_sales']) ? $this->data['motorcycle_sales'] : [];
        $parts = isset($this->data['parts_sales']) ? $this->data['parts_sales'] : [];
        
        if (empty($sales) && empty($parts)) {
            return [
                'predicted_revenue' => 0,
                'avg_monthly_revenue' => 0,
                'trend_percentage' => 0,
                'confidence' => 'No Data',
                'confidence_score' => 0,
                'based_on_months' => 0,
                'next_month' => date('F Y', strtotime('+1 month')),
                'message' => 'Not enough data for prediction'
            ];
        }
        
        $total_revenue = 0;
        $months_count = 0;
        
        foreach ($sales as $month) {
            $total_revenue += (float)$month['total_revenue'];
            $months_count++;
        }
        
        foreach ($parts as $month) {
            $total_revenue += (float)$month['total_revenue'];
            $months_count++;
        }
        
        if ($months_count === 0) {
            return [
                'predicted_revenue' => 0,
                'avg_monthly_revenue' => 0,
                'trend_percentage' => 0,
                'confidence' => 'No Data',
                'confidence_score' => 0,
                'based_on_months' => 0,
                'next_month' => date('F Y', strtotime('+1 month')),
                'message' => 'No sales data available'
            ];
        }
        
        $avg_monthly_revenue = $total_revenue / $months_count;
        $trend = $this->calculateTrend();
        $predicted = $avg_monthly_revenue * (1 + ($trend / 100));
        $confidence = $this->calculateConfidence($sales, $parts);
        
        return [
            'predicted_revenue' => round($predicted, 2),
            'avg_monthly_revenue' => round($avg_monthly_revenue, 2),
            'trend_percentage' => round($trend, 2),
            'confidence' => $confidence['level'],
            'confidence_score' => $confidence['score'],
            'based_on_months' => $months_count,
            'next_month' => date('F Y', strtotime('+1 month')),
            'message' => $confidence['message']
        ];
    }
    
    // ✅ FIXED: Check if data exists before accessing
    private function calculateTrend() {
        $sales = isset($this->data['motorcycle_sales']) ? $this->data['motorcycle_sales'] : [];
        $months = count($sales);
        
        if ($months < 2) {
            return 0;
        }
        
        $recent = array_slice($sales, -3);
        $previous = array_slice($sales, 0, 3);
        
        $recent_avg = 0;
        $previous_avg = 0;
        
        foreach ($recent as $month) {
            $recent_avg += (float)$month['total_revenue'];
        }
        $recent_avg = count($recent) > 0 ? $recent_avg / count($recent) : 0;
        
        foreach ($previous as $month) {
            $previous_avg += (float)$month['total_revenue'];
        }
        $previous_avg = count($previous) > 0 ? $previous_avg / count($previous) : 0;
        
        if ($previous_avg > 0) {
            return (($recent_avg - $previous_avg) / $previous_avg) * 100;
        }
        
        return 0;
    }
    
    private function calculateConfidence($sales, $parts) {
        $total_months = count($sales) + count($parts);
        $total_transactions = 0;
        
        foreach ($sales as $month) {
            $total_transactions += (int)$month['total_transactions'];
        }
        foreach ($parts as $month) {
            $total_transactions += (int)$month['total_transactions'];
        }
        
        if ($total_months < 3 || $total_transactions < 5) {
            return [
                'level' => 'Low',
                'score' => 30,
                'message' => 'Need more historical data for accurate prediction'
            ];
        } elseif ($total_months < 6 || $total_transactions < 15) {
            return [
                'level' => 'Medium',
                'score' => 60,
                'message' => 'Moderate confidence - more data would improve accuracy'
            ];
        } else {
            return [
                'level' => 'High',
                'score' => 85,
                'message' => 'Sufficient data for reliable prediction'
            ];
        }
    }
    
    private function predictTopProductsNextMonth() {
        $query = "
            SELECT 
                i.id,
                i.name,
                i.sku,
                i.price,
                i.image,
                COALESCE(SUM(t.selling_price), 0) as total_revenue,
                COUNT(t.id) as total_sold,
                COALESCE(ROUND(AVG(t.selling_price), 2), 0) as avg_price,
                CASE 
                    WHEN COUNT(t.id) > 0 
                    THEN ROUND(COUNT(t.id) / 3, 1) 
                    ELSE 0 
                END as monthly_sales_velocity
            FROM inventory i
            LEFT JOIN transactions t ON i.id = t.inventory_id 
                AND t.status = 'Completed'
                AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            WHERE i.category = 'Motorcycle'
            GROUP BY i.id
            HAVING total_sold > 0
            ORDER BY monthly_sales_velocity DESC
            LIMIT 3
        ";
        
        $stmt = $this->pdo->query($query);
        $data = $stmt->fetchAll();
        
        foreach ($data as &$product) {
            $product['predicted_next_month_sales'] = round($product['monthly_sales_velocity'] * 1.1, 1);
            $product['predicted_next_month_revenue'] = round($product['predicted_next_month_sales'] * $product['avg_price'], 2);
            $product['monthly_sales_velocity'] = round($product['monthly_sales_velocity'], 1);
            $product['total_revenue'] = round($product['total_revenue'], 2);
        }
        
        return $data;
    }
    
    private function calculateSummary() {
        $summary = [
            'total_revenue_last_6months' => 0,
            'total_motorcycle_sales' => 0,
            'total_parts_sales' => 0,
            'total_transactions' => 0,
            'average_monthly_revenue' => 0,
            'best_month' => null,
            'worst_month' => null,
            'total_customers' => 0,
            'total_products' => 0,
            'low_stock_items' => 0
        ];
        
        $motorcycle_revenue = 0;
        foreach ($this->data['motorcycle_sales'] as $sale) {
            $motorcycle_revenue += (float)$sale['total_revenue'];
        }
        $summary['total_motorcycle_sales'] = $motorcycle_revenue;
        
        $parts_revenue = 0;
        foreach ($this->data['parts_sales'] as $sale) {
            $parts_revenue += (float)$sale['total_revenue'];
        }
        $summary['total_parts_sales'] = $parts_revenue;
        
        $summary['total_revenue_last_6months'] = $motorcycle_revenue + $parts_revenue;
        
        $months_count = max(count($this->data['motorcycle_sales']), count($this->data['parts_sales']));
        if ($months_count > 0) {
            $summary['average_monthly_revenue'] = $summary['total_revenue_last_6months'] / $months_count;
        }
        
        $summary['total_customers'] = $this->data['customer_analysis']['total_customers'];
        $summary['total_products'] = count($this->data['inventory_status']);
        $summary['low_stock_items'] = count($this->data['low_stock_alerts']);
        
        return $summary;
    }
}

// ============ EXECUTE ============
try {
    $collector = new PredictiveDataCollector($pdo);
    $data = $collector->collectAllData();
    
    echo json_encode($data, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>