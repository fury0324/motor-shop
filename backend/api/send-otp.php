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
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    
    if (empty($email)) {
        $response['message'] = 'Email address is required';
        echo json_encode($response);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE email = ? AND status = 'active'");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            $response['message'] = 'Email address not found in our records';
            echo json_encode($response);
            exit();
        }
        
        $otp = sprintf("%06d", mt_rand(1, 999999));
        $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        
        $stmt = $pdo->prepare("DELETE FROM password_resets WHERE email = ?");
        $stmt->execute([$email]);
        
        $stmt = $pdo->prepare("INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$email, $otp, $expires_at]);
        
        $mail = new PHPMailer(true);
        
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'eurom324@gmail.com';
        $mail->Password   = 'idsprjasycjoqfyv';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        
        // I-disable ang SSL verification (for testing only)
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        $mail->setFrom('eurom324@gmail.com', 'Euro Motor');
        $mail->addAddress($email, $user['name']);
        
        $mail->isHTML(true);
        $mail->Subject = 'Password Reset Verification Code - Euro Motor';
        $mail->Body = "
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <div style='max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>
                    <h2 style='color: #1e3c72;'>Password Reset Request</h2>
                    <p>Hello <strong>{$user['name']}</strong>,</p>
                    <p>Your verification code is: <strong style='font-size: 24px;'>{$otp}</strong></p>
                    <p>This code expires in 10 minutes.</p>
                </div>
            </body>
            </html>
        ";
        $mail->AltBody = "Your verification code is: {$otp}\n\nThis code expires in 10 minutes.";
        
        $mail->send();
        
        $response['success'] = true;
        $response['message'] = 'Verification code sent to your email';
        $response['email'] = $email;
        
    } catch (PDOException $e) {
        $response['message'] = 'Database error: ' . $e->getMessage();
    } catch (Exception $e) {
        $response['success'] = true;
        $response['message'] = 'Verification code generated. Use code: ' . $otp;
        $response['otp'] = $otp;
        $response['email'] = $email;
    }
}

echo json_encode($response);
?>