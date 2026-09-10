<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-API-Token, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('DB_HOST', '192.168.10.245');
define('DB_NAME', 'Proyecto_Movil_Vinus_Ambiental');
define('DB_USER', 'root');
define('DB_PASS', 'hat0v1al');
define('DB_CHARSET', 'utf8mb4');
define('API_TOKEN', 'vinus-ambiental-movil-2026-09');

function getRequestToken() {
    $token = $_SERVER['HTTP_X_API_TOKEN'] ?? '';

    if ($token !== '') {
        return $token;
    }

    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($authorization, 'Bearer ') === 0) {
        return trim(substr($authorization, 7));
    }

    return '';
}

function requireApiToken() {
    $token = getRequestToken();

    if (!is_string($token) || $token === '' || !hash_equals(API_TOKEN, $token)) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Token de acceso invalido o ausente.',
        ]);
        exit;
    }
}

function getConnection() {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    return new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
