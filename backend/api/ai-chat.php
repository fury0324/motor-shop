<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ✅ Start session to store conversation context
session_start();

$input = json_decode(file_get_contents('php://input'), true);
$userMessage = $input['message'] ?? '';

if (empty($userMessage)) {
    echo json_encode(['reply' => 'No message received']);
    exit();
}

// ✅ Check if user has provided data
$hasData = isset($_SESSION['data_context']) && !empty($_SESSION['data_context']);

// ✅ Check if current message contains data
if (strpos($userMessage, 'Transaction No') !== false || 
    strpos($userMessage, 'PRT-') !== false || 
    strpos($userMessage, 'TRX-') !== false ||
    strpos($userMessage, '|') !== false ||
    strpos($userMessage, 'Part') !== false ||
    strpos($userMessage, 'Model') !== false) {
    
    $_SESSION['data_context'] = $userMessage;
    $hasData = true;
}

// ================================================================
// GREETINGS CHECK
// ================================================================

$lowerMessage = strtolower(trim($userMessage));
$greetings = ['hi', 'hello', 'hey', 'hji', 'helo', 'hola', 'good morning', 'good afternoon', 'good evening'];

foreach ($greetings as $greeting) {
    if (strpos($lowerMessage, $greeting) !== false && strlen($userMessage) < 20) {
        echo json_encode(['reply' => 'Hello! 👋 How can I help you today? You can paste transaction data for analysis, or ask about our motorcycles and parts.']);
        exit();
    }
}

// ================================================================
// CHECK IF ASKING FOR PREDICTION WITHOUT DATA
// ================================================================

if ((strpos($lowerMessage, 'predict') !== false || 
     strpos($lowerMessage, 'forecast') !== false || 
     strpos($lowerMessage, 'future') !== false) && 
    !$hasData) {
    
    echo json_encode(['reply' => 'I need transaction data to make predictions. Please paste your transaction data first (like the one from your Excel/CSV file), then I can analyze it and give you a prediction.']);
    exit();
}

// ================================================================
// CHECK IF ASKING ABOUT DATA WITHOUT HAVING DATA
// ================================================================

if ((strpos($lowerMessage, 'revenue') !== false || 
     strpos($lowerMessage, 'total') !== false || 
     strpos($lowerMessage, 'sales') !== false || 
     strpos($lowerMessage, 'customer') !== false) && 
    !$hasData) {
    
    echo json_encode(['reply' => 'I don\'t have any data to analyze yet. Please paste your transaction data first (copy it from your Excel/CSV file), then I can answer your questions about revenue, customers, and sales.']);
    exit();
}

// ================================================================
// SMART OLLAMA WITH GEMMA3:4B
// ================================================================

$baseUrl = 'http://localhost:11434';
$model = 'gemma3:4b';  // ✅ NEW MODEL - mas matalino!

// ✅ Build system prompt
$systemPrompt = "You are Euro Motor Shop AI Assistant. You are smart and analytical.

IMPORTANT RULES:
1. ONLY use the data provided to answer questions.
2. If data is available, analyze it carefully.
3. If NO data is available, politely say so and ask the user to paste data.
4. Never make up data or guess.
5. Be honest about what you can and cannot do.

Current data available: " . ($hasData ? 'YES - User has provided transaction data' : 'NO - No data provided yet') . "

If data is available, here it is:
" . ($_SESSION['data_context'] ?? 'No data') . "

Instructions:
- If user asks for prediction and data is available, analyze the data and make a prediction.
- If user asks for prediction and data is NOT available, tell them to paste data first.
- Be honest, accurate, and helpful.";

$prompt = $systemPrompt . "\n\nUser Question: " . $userMessage . "\n\nAssistant:";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/generate');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => $model,
    'prompt' => $prompt,
    'stream' => false,
    'options' => [
        'temperature' => 0.2,
        'num_predict' => 250
    ]
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || $response === false) {
    $reply = 'Hello! 👋 How can I help you today? You can paste transaction data for analysis.';
} else {
    $result = json_decode($response, true);
    $reply = $result['response'] ?? 'Hello! How can I help you today?';
    
    // ✅ Clean up
    $reply = preg_replace('/\s+/', ' ', $reply);
    $reply = trim($reply);
}

echo json_encode(['reply' => $reply]);
?>