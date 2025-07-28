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
    // Escapa o caminho do projeto
    $escaped_dir = escapeshellarg($repo_dir);

    // Caminho do Git (caso necessário, personalize aqui)
    $git_cmd = 'git';

    // Comando completo
    $cmd = "cd $escaped_dir && $git_cmd pull origin main";

    // Opcional: salva a saída num arquivo de log
    $output = shell_exec($cmd . " 2>&1");
    file_put_contents($repo_dir . '/webhook.log', "[" . date('Y-m-d H:i:s') . "]\n" . $output . "\n\n", FILE_APPEND);

    http_response_code(200);
    echo "Atualização feita com sucesso!";
} else {
    http_response_code(400);
    echo "Requisição inválida.";
}
