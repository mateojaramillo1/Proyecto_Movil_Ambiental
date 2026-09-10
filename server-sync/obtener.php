<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    requireApiToken();
    $pdo = getConnection();

    $registroStmt = $pdo->prepare(
        'SELECT * FROM registros ORDER BY updated_at DESC LIMIT 500'
    );
    $registroStmt->execute();
    $registros = $registroStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Registros recuperados correctamente.',
        'registros' => $registros,
        'total' => count($registros),
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $error->getMessage(),
    ]);
}
?>
