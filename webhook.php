<?php
// Caminho do seu projeto
$repo_dir = 'C:\xampp\htdocs\site\chatbot'; 
$secret = 'Batatadoce*123'; // MESMA usada no GitHub

// Captura assinatura e corpo do webhook
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$payload = file_get_contents('php://input');

// Calcula assinatura local
$hash = 'sha256=' . hash_hmac('sha256', $payload, $secret);

// Compara assinatura enviada com a calculada
if (!hash_equals($hash, $signature)) {
    http_response_code(403);
    echo "Assinatura inválida!";
    exit;
}

// Tudo certo, processa o webhook
$data = json_decode($payload, true);

if ($data && isset($data['ref'])) {
    shell_exec("cd $repo_dir && git pull 2>&1 >> webhook.log");
    http_response_code(200);
    echo "Atualização feita com sucesso!";
} else {
    http_response_code(400);
    echo "Requisição inválida.";
}
