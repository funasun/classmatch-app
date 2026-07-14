<?php
// 環境省 熱中症予防情報サイト API プロキシ
// 学校ネットワークから env.go.jp への直接アクセスが弾かれる場合に使う。
// 例: wbgt.php?data_type=1&location_type=1&wbgt_nos=72086&date_from=...&date_to=...

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// 許可するパラメータだけを転送する（オープンプロキシ化を防ぐ）
$allowed = ['data_type', 'location_type', 'wbgt_nos', 'date_from', 'date_to'];
$params = [];
foreach ($allowed as $key) {
    if (isset($_GET[$key])) {
        $params[$key] = preg_replace('/[^0-9,]/', '', (string)$_GET[$key]);
    }
}
if (empty($params)) {
    http_response_code(400);
    echo json_encode(['error' => 'missing params']);
    exit;
}

$url = 'https://www.wbgt.env.go.jp/api/v1/getSurveyData?' . http_build_query($params);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => true,
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if ($body === false) {
    http_response_code(502);
    echo json_encode(['error' => 'upstream failed']);
    exit;
}
http_response_code($status ?: 200);
echo $body;
