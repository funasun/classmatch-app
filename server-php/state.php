<?php
// 夏季クラスマッチ2026 状態API
// GET  state.php?known=<version> … 状態JSONを返す（known と同じ version なら {"unchanged":true}）
// POST state.php {"passcode":"...","state":{...}} … 保存（合言葉必須）

// ▼ 設置時にここを変更してください（管理画面の VITE_ADMIN_PASSCODE と同じ値に）
$PASSCODE = 'classmatch';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/state.json';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || !isset($body['passcode'], $body['state'])) {
        http_response_code(400);
        echo json_encode(['error' => 'bad request']);
        exit;
    }
    if (!hash_equals($PASSCODE, (string)$body['passcode'])) {
        http_response_code(403);
        echo json_encode(['error' => 'passcode mismatch']);
        exit;
    }
    $json = json_encode($body['state'], JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > 2 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid state']);
        exit;
    }
    // 同時書き込みで壊れないよう一時ファイル経由で置き換える
    $tmp = $dataFile . '.tmp';
    file_put_contents($tmp, $json, LOCK_EX);
    rename($tmp, $dataFile);
    echo json_encode(['ok' => true]);
    exit;
}

// GET
if (!file_exists($dataFile)) {
    echo json_encode(['version' => 0, 'empty' => true]);
    exit;
}
$raw = file_get_contents($dataFile);
$known = isset($_GET['known']) ? (int)$_GET['known'] : -1;
$state = json_decode($raw, true);
if (is_array($state) && isset($state['version']) && (int)$state['version'] === $known) {
    echo json_encode(['unchanged' => true]);
    exit;
}
echo $raw;
