<?php
function authenticateBokunApi($method, $path, $body = null) {
    $accessKey = 'a8631bded93c4f96b94b34d6649ba4ec';
    $secretKey = 'f76d4a3d8d104b6e8675a0e3ac5f1d8d';
    $base_url = 'https://api.bokun.io';
    $date = gmdate("Y-m-d H:i:s");
    $data = $date . $accessKey . $method . $path;
    $rawSignature = hash_hmac('sha1', $data, $secretKey, true);
    $signature = base64_encode($rawSignature);
    $headers = [
        'accept: application/json',
        'Content-Type: application/json',
        'X-Bokun-Date: ' . $date,
        'X-Bokun-Signature: ' . $signature,
        'X-Bokun-AccessKey: ' . $accessKey
    ];
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $base_url . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        curl_close($ch);
        return false;
    }
    curl_close($ch);
    $responseArray = json_decode($response, true);
    return $responseArray !== null ? $responseArray : false;
}


// Delete transients
// function delete_all_transients() {
//     global $wpdb;

//     // Query for all transient keys
//     $transient_prefix = '_transient_';
//     $transient_timeout_prefix = '_transient_timeout_';

//     // Delete all transient data and timeout entries
//     $wpdb->query(
//         $wpdb->prepare(
//             "DELETE FROM $wpdb->options WHERE option_name LIKE %s OR option_name LIKE %s",
//             $transient_prefix . '%',
//             $transient_timeout_prefix . '%'
//         )
//     );
// }
// add_action('init', 'delete_all_transients');
// echo "deleted transients...";
// die;
