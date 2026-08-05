<?php
// backend/api/send-due-payment-notifications.php
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
require_once __DIR__ . '/../PHP-Mailer-master/src/PHPMailer.php';
require_once __DIR__ . '/../PHP-Mailer-master/src/SMTP.php';
require_once __DIR__ . '/../PHP-Mailer-master/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// ============ GET TODAY'S DUE PAYMENTS ============
function getTodayDuePayments($pdo) {
    $today = date('Y-m-d');
    
    $query = "
        SELECT 
            ip.*,
            t.transaction_no,
            t.customer_id,
            c.full_name as customer_name,
            c.email as customer_email,
            c.contact_number,
            i.name as item_name,
            t.selling_price as total_amount
        FROM installment_payments ip
        JOIN transactions t ON ip.transaction_id = t.id
        JOIN customers c ON t.customer_id = c.id
        JOIN inventory i ON t.inventory_id = i.id
        WHERE ip.due_date = ?
            AND ip.status != 'Paid'
            AND ip.status != 'Overdue'
        ORDER BY c.full_name ASC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$today]);
    return $stmt->fetchAll();
}

// ============ GET STAFF EMAILS ============
function getStaffEmails($pdo) {
    $query = "
        SELECT name, email, role 
        FROM users 
        WHERE role IN ('admin', 'cashier') 
            AND status = 'active'
    ";
    $stmt = $pdo->query($query);
    return $stmt->fetchAll();
}

// ============ SEND EMAIL USING EXISTING MAILER ============
function sendEmailNotification($to, $name, $subject, $htmlBody, $plainBody = '') {
    try {
        $mail = new PHPMailer(true);
        
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'eurom324@gmail.com';
        $mail->Password   = 'idsprjasycjoqfyv';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        
        // Disable SSL verification (for testing only)
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        $mail->setFrom('eurom324@gmail.com', 'Euro Motor Shop');
        $mail->addAddress($to, $name);
        
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        
        if (!empty($plainBody)) {
            $mail->AltBody = $plainBody;
        }
        
        return $mail->send();
        
    } catch (Exception $e) {
        error_log("Email failed to $to: " . $e->getMessage());
        return false;
    }
}

// ============ BUILD CUSTOMER EMAIL ============
function buildCustomerEmail($payment, $today) {
    $formattedDate = date('F d, Y', strtotime($today));
    $dueDate = date('F d, Y', strtotime($payment['due_date']));
    $amountDue = number_format($payment['amount_due'], 2);
    $transactionNo = $payment['transaction_no'];
    $itemName = $payment['item_name'];
    $customerName = $payment['customer_name'];
    
    return "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #0b1c30; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; margin: -30px -30px 20px -30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0; opacity: 0.8; }
            .amount { font-size: 32px; font-weight: bold; color: #ba1a1a; }
            .due-date { font-size: 18px; font-weight: bold; color: #0b1c30; }
            .details { background: #f8f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .details table { width: 100%; }
            .details td { padding: 5px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 5px; margin: 10px 0; }
            .btn { display: inline-block; background: #0b1c30; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🏍️ Euro Motor Shop</h1>
                <p>Payment Reminder</p>
            </div>
            
            <p>Dear <strong>{$customerName}</strong>,</p>
            
            <p>This is a friendly reminder that your installment payment is due today.</p>
            
            <div class='warning'>
                ⚠️ <strong>Please settle your payment today to avoid penalties.</strong>
            </div>
            
            <div class='details'>
                <table>
                    <tr>
                        <td><strong>Transaction No:</strong></td>
                        <td>{$transactionNo}</td>
                    </tr>
                    <tr>
                        <td><strong>Item:</strong></td>
                        <td>{$itemName}</td>
                    </tr>
                    <tr>
                        <td><strong>Due Date:</strong></td>
                        <td class='due-date'>{$dueDate}</td>
                    </tr>
                    <tr>
                        <td><strong>Amount Due:</strong></td>
                        <td class='amount'>₱{$amountDue}</td>
                    </tr>
                </table>
            </div>
            
            <p>You can pay at our store or through the following methods:</p>
            <ul>
                <li>💵 Cash at our branch</li>
                <li>🏦 Bank Transfer (BPI, BDO, Metrobank)</li>
                <li>📱 GCash / PayMaya</li>
            </ul>
            
            <p>If you have already made the payment, please disregard this reminder.</p>
            
            <p>Thank you for your cooperation!</p>
            
            <div class='footer'>
                <p>Euro Motor Shop • Your Trusted Motorcycle Dealer</p>
                <p>📍 123 Main Street, Zamboanga City</p>
                <p>📞 (062) 123-4567 • 📧 support@euromotor.com</p>
            </div>
        </div>
    </body>
    </html>
    ";
}

// ============ BUILD STAFF EMAIL ============
function buildStaffEmail($duePayments, $today, $staffName) {
    $formattedDate = date('F d, Y', strtotime($today));
    $count = count($duePayments);
    
    $rows = '';
    foreach ($duePayments as $payment) {
        $amountDue = number_format($payment['amount_due'], 2);
        $rows .= "
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #eee;'>{$payment['customer_name']}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee;'>{$payment['transaction_no']}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee;'>{$payment['item_name']}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: right;'>₱{$amountDue}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee;'>{$payment['contact_number']}</td>
            </tr>
        ";
    }
    
    return "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #0b1c30; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; margin: -30px -30px 20px -30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .badge { background: #ba1a1a; color: white; padding: 3px 12px; border-radius: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background: #f8f9ff; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            .action-btn { display: inline-block; background: #0b1c30; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🏍️ Euro Motor Shop</h1>
                <p>⚠️ Due Payment Alert</p>
            </div>
            
            <p>Hello <strong>{$staffName}</strong>,</p>
            
            <p>There <strong>{$count}</strong> payment(s) due today ({$formattedDate}).</p>
            
            <h3 style='margin-top: 20px;'>📋 List of Customers with Due Payments:</h3>
            
            <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Transaction</th>
                        <th>Item</th>
                        <th style='text-align: right;'>Amount Due</th>
                        <th>Contact</th>
                    </tr>
                </thead>
                <tbody>
                    {$rows}
                </tbody>
            </table>
            
            <p style='margin-top: 20px;'>
                <a href='http://localhost:5173/admin/installment-payments' class='action-btn' style='color: white; text-decoration: none;'>
                    📊 View in Dashboard
                </a>
            </p>
            
            <p>Please follow up with these customers to ensure timely payments.</p>
            
            <div class='footer'>
                <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    ";
}

// ============ MAIN EXECUTION ============
$response = ['success' => false, 'message' => '', 'data' => []];

try {
    $today = date('Y-m-d');
    $duePayments = getTodayDuePayments($pdo);
    
    if (empty($duePayments)) {
        $response['success'] = true;
        $response['message'] = 'No due payments today';
        echo json_encode($response);
        exit();
    }
    
    $response['data']['due_count'] = count($duePayments);
    $response['data']['today'] = $today;
    
    // Send to customers
    $customerSent = 0;
    $customerFailed = [];
    
    foreach ($duePayments as $payment) {
        if (empty($payment['customer_email'])) {
            $customerFailed[] = $payment['customer_name'] . ' (no email)';
            continue;
        }
        
        $subject = "🔔 Payment Reminder - Euro Motor Shop";
        $htmlBody = buildCustomerEmail($payment, $today);
        $plainBody = "Payment reminder for {$payment['customer_name']}. Amount due: ₱{$payment['amount_due']}";
        
        $sent = sendEmailNotification(
            $payment['customer_email'],
            $payment['customer_name'],
            $subject,
            $htmlBody,
            $plainBody
        );
        
        if ($sent) {
            $customerSent++;
        } else {
            $customerFailed[] = $payment['customer_name'];
        }
    }
    
    $response['data']['customers_notified'] = $customerSent;
    $response['data']['customer_failed'] = $customerFailed;
    
    // Send to staff (Admin & Cashier)
    $staff = getStaffEmails($pdo);
    $staffSent = 0;
    $staffFailed = [];
    
    foreach ($staff as $staffMember) {
        $subject = "⚠️ Payment Alert - " . count($duePayments) . " due today";
        $htmlBody = buildStaffEmail($duePayments, $today, $staffMember['name']);
        $plainBody = count($duePayments) . " payments due today. Check dashboard for details.";
        
        $sent = sendEmailNotification(
            $staffMember['email'],
            $staffMember['name'],
            $subject,
            $htmlBody,
            $plainBody
        );
        
        if ($sent) {
            $staffSent++;
        } else {
            $staffFailed[] = $staffMember['email'];
        }
    }
    
    $response['data']['staff_notified'] = $staffSent;
    $response['data']['staff_failed'] = $staffFailed;
    
    $response['success'] = true;
    $response['message'] = "Notified {$customerSent} customers and {$staffSent} staff members";
    
} catch (PDOException $e) {
    $response['message'] = 'Database error: ' . $e->getMessage();
} catch (Exception $e) {
    $response['message'] = 'Error: ' . $e->getMessage();
}

echo json_encode($response);
?>