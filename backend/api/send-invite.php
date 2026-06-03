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
require_once __DIR__ . '/../PHP-Mailer-master/src/PHPMailer.php';
require_once __DIR__ . '/../PHP-Mailer-master/src/SMTP.php';
require_once __DIR__ . '/../PHP-Mailer-master/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $name = $_POST['name'] ?? '';
    $role = $_POST['role'] ?? '';
    
    if (empty($email) || empty($name) || empty($role)) {
        $response['message'] = 'Missing required fields';
        echo json_encode($response);
        exit();
    }
    
    try {
        $mail = new PHPMailer(true);
        
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'eurom324@gmail.com';
        $mail->Password   = 'idsprjasycjoqfyv';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        $mail->setFrom('eurom324@gmail.com', 'Euro Motor');
        $mail->addAddress($email, $name);
        
        $mail->isHTML(true);
        $mail->Subject = 'Welcome to Euro Motor - Account Invitation';
        $mail->Body = "
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>
                    <div style='background: #1e3c72; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;'>
                        <h2 style='color: white; margin: 0;'>Euro Motor</h2>
                        <p style='color: #a0c4ff; margin: 5px 0 0;'>Precision Inventory Management</p>
                    </div>
                    <div style='padding: 30px 20px;'>
                        <h3 style='color: #333;'>Welcome, {$name}!</h3>
                        <p>Your account has been created successfully. You are now part of the Euro Motor system as a <strong>" . ucfirst($role) . "</strong>.</p>
                        <div style='background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                            <p><strong>Email:</strong> {$email}</p>
                            <p><strong>Role:</strong> " . ucfirst($role) . "</p>
                        </div>
                        <p>To set up your password and access your account, please click the button below:</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='http://localhost:5173/set-password?email={$email}' style='background: #1e3c72; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;'>Set Your Password</a>
                        </div>
                        <p>This invitation link will expire in 48 hours.</p>
                        <p>If you did not request this account, please ignore this email.</p>
                        <hr style='margin: 20px 0; border: none; border-top: 1px solid #eee;'>
                        <p style='color: #999; font-size: 12px;'>Euro Motor - Precision Inventory Management System</p>
                    </div>
                </div>
            </body>
            </html>
        ";
        $mail->AltBody = "Welcome to Euro Motor!\n\nYour account has been created successfully as a " . ucfirst($role) . ".\n\nEmail: {$email}\n\nTo set up your password, visit: http://localhost:5173/set-password?email={$email}\n\nThis invitation link will expire in 48 hours.\n\nEuro Motor - Precision Inventory Management";
        
        $mail->send();
        
        $response['success'] = true;
        $response['message'] = 'Invitation email sent successfully';
        
    } catch (Exception $e) {
        $response['message'] = 'Failed to send email: ' . $mail->ErrorInfo;
    }
}

echo json_encode($response);
?>