<?php
function insert_cart_session($user_id = null, $expires_in_hours = 24)
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'cart_sessions';
    $session_id = uniqid('cart_', true);
    $expires_at = date('Y-m-d H:i:s', strtotime("+$expires_in_hours hours"));
    $wpdb->insert($table_name, [
        'session_id' => $session_id,
        'user_id' => $user_id,
        'expires_at' => $expires_at
    ]);
    return $session_id;
}
function get_cart_session($session_id)
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'cart_sessions';
    $result = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE session_id = %s", $session_id));
    return $result;
}
function delete_expired_sessions()
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'cart_sessions';
    $wpdb->query("DELETE FROM $table_name WHERE expires_at < NOW()");
}
add_action('wp_ajax_generate_cart_session', 'generate_cart_session_handler');
add_action('wp_ajax_nopriv_generate_cart_session', 'generate_cart_session_handler');
function generate_cart_session_handler()
{
    global $wpdb;
    // Clean expired sessions
    delete_expired_sessions();
    // Generate a new session
    $user_id = is_user_logged_in() ? get_current_user_id() : null;
    $session_id = insert_cart_session($user_id);
    if ($session_id) {
        wp_send_json_success(['session_id' => $session_id]);
    } else {
        wp_send_json_error(['message' => 'Failed to create a new session.']);
    }
}
function add_to_cart_handler()
{
    $session_id = $_POST['session_id'] ;
    $activity_id = $_POST['activity_id'];
    $rate_id = $_POST['rate_id'];
    $start_time_id = $_POST['start_time_id'];
    $date = $_POST['date'] ;
    $passengers = $_POST['passengers'];
    $currency = $_POST['currency'];
    $language = $_POST['language'];
    $extras = isset($_POST['extras']) ? $_POST['extras'] : null;
    if (!$activity_id || !$rate_id || !$start_time_id || !$date || !$passengers) {
        wp_send_json_error(['message' => 'Missing or invalid parameters.']);
        return;
    }
    $path = "/shopping-cart.json/session/{$session_id}/activity?currency={$currency}&lang={$language}";
    $method = 'POST';
    $body = [
        "activityId" => $activity_id,
        "rateId" => $rate_id,
        "startTimeId" => $start_time_id,
        "date" => $date,
        "pricingCategoryBookings" => $passengers
    ];

    if ($extras) {
        $body["extras"] = $extras;
    }
//    printR($body);
    $response = authenticateBokunApi($method, $path, $body);
    if ($response && !isset($response['error'])) {
        wp_send_json_success($response);
    } else {
        wp_send_json_error(['message' => 'Failed to add item to cart.', 'error' => $response['error'] ?? 'Unknown error.']);
    }
}
add_action('wp_ajax_add_to_cart', 'add_to_cart_handler');
add_action('wp_ajax_nopriv_add_to_cart', 'add_to_cart_handler');
// get cart details
function get_cart_details()
{
    // Check if the request is valid and is coming via AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => 'Invalid request.']);
        return;
    }
    $session_id = sanitize_text_field($_POST['session_id'] ?? '');
    if (!$session_id) {
        wp_send_json_error(['message' => 'Session ID is required.']);
        return;
    }
    $method = 'GET';
    $path = "/cart.json/{$session_id}";
    $details = authenticateBokunApi($method, $path);
    if ($details) {
        wp_send_json_success($details);
    }
    else {
        wp_send_json_error(['message' => 'Failed to fetch cart details.']);
    }
}
add_action('wp_ajax_get_cart_details', 'get_cart_details');
add_action('wp_ajax_nopriv_get_cart_details', 'get_cart_details');
//get cart details 
//promo code function
function submit_promo_code()
{
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => 'Invalid request.']);
        return;
    }
    $session_id = sanitize_text_field($_POST['session_id'] ?? '');
    $promo_code = sanitize_text_field($_POST['promo_code'] ?? '');
    if (!$session_id || !$promo_code) {
        wp_send_json_error(['message' => 'Session ID and Promo Code are required.']);
        return;
    }
    $method = 'GET';
    $path = "/cart.json/{$session_id}/apply-promo-code/{$promo_code}";
    $cache_key = 'submit_promo_code_' . md5($path);
    $promo_code_response = get_transient($cache_key);
    if (false === $promo_code_response) {
        $promo_code_response = authenticateBokunApi($method, $path);
        if ($promo_code_response) {
            set_transient($cache_key, $promo_code_response, HOUR_IN_SECONDS);
        } else {
            error_log('Failed to fetch promo code details from Bokun API.');
            wp_send_json_error(['message' => 'Failed to fetch promo code details.']);
            return;
        }
    }
    wp_send_json_success($promo_code_response);
}
add_action('wp_ajax_submit_promo_code', 'submit_promo_code');
add_action('wp_ajax_nopriv_submit_promo_code', 'submit_promo_code');
//end promo code function
//get checkout options 
function get_checkout_options()
{
    // Validate if the request is an AJAX call
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => 'Invalid request.']);
    }
    // Sanitize session ID
    $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : '';
    if (empty($session_id)) {
        wp_send_json_error(['message' => 'Session ID is required.']);
    }
    // Define API path and cache key
    $method = 'GET';
    $path = "/checkout.json/options/shopping-cart/{$session_id}";
    $response = authenticateBokunApi($method, $path);
    wp_send_json_success($response);
}
add_action('wp_ajax_get_checkout_options', 'get_checkout_options');
add_action('wp_ajax_nopriv_get_checkout_options', 'get_checkout_options');
// end get checkout options
//retrive cart question  
function remove_activity_form_cart()
{
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => 'Invalid request.']);
        return;
    }
    $session_id = sanitize_text_field($_POST['session_id'] ?? '');
    $product_confirmation_code = sanitize_text_field($_POST['product_confirmation_code'] ?? '');
    if (!$session_id|| !$product_confirmation_code) {
        wp_send_json_error(['message' => 'Product Confirmation Code and Session ID is required.']);
        return;
    }
    $method = 'GET';
    $path = "/cart.json/{$session_id}/remove/{$product_confirmation_code}";
    $response = authenticateBokunApi($method, $path);
    if ($response) {
        wp_send_json_success($response);
    } else {
        wp_send_json_error(['message' => 'Failed to remove item from cart.']);
    }
}
add_action('wp_ajax_remove_activity_form_cart', 'remove_activity_form_cart');
add_action('wp_ajax_nopriv_remove_activity_form_cart', 'remove_activity_form_cart');
//end retrive cart question
// process checkout
// Register the activation hook
function bokun_checkout_submit_handler()
{
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => 'Invalid request.']);
        return;
    }
    global $wpdb;
    $booking_uuid = 'booking_uuid_' . wp_generate_uuid4();
    $shoppingCart = $_POST['shoppingCart'];
    $body = [
        "checkoutOption" => "CUSTOMER_FULL_PAYMENT",
        "paymentMethod" => "RESERVE_FOR_EXTERNAL_PAYMENT",
        "source" => "SHOPPING_CART",
        "shoppingCart" => $shoppingCart,
        "sendNotificationToMainContact" => true,
        "showPricesInNotification" => true,
        "successUrl" => "http://localhost/xlogicsolutions/atlas-alarab/successfully-booking",
        "errorUrl" => "http://localhost/xlogicsolutions/atlas-alarab/error-booking",
        "cancelUrl" => "http://localhost/xlogicsolutions/atlas-alarab/cancelUrl"
    ];
    $method = 'POST';
    $path = '/checkout.json/submit';
    $response = authenticateBokunApi($method, $path, $body);
    if ($response) {
       // printR($response);
        $confirmation_code = $response['booking']['confirmationCode'] ?? 'not found';
        $booking_status = $response['booking']['status'] ?? 'not found';
        $payment_status = 'pending';
        $currency = $response['booking']['currency'] ?? 'AED';
        $amount = $response['booking']['totalPrice'] ?? '0';
        $product_invoices = $response['booking']['invoice']['productInvoices'] ?? 'not found';
        $table_name = $wpdb->prefix . 'bookings' ; 
         $wpdb->insert(
            $table_name,
            [
                'booking_uuid' => $booking_uuid,
                'confirmation_code' => $confirmation_code,
                'booking_status' => $booking_status,
                'currency' => $currency,
                'total_price' => $amount,
                'payment_status' => $payment_status,
                'product_invoices' => json_encode($product_invoices),
                'created_at' => current_time('mysql'), 
            ]
        );
        if ($wpdb->last_error) {
            wp_send_json_error(['message' => 'Failed to store booking details.', 'error' => $wpdb->last_error]);
            return;
        }
        $bokun_mode = get_option('bokun_mode', 'test');
        if ($bokun_mode === 'live') {
           $live_mode =  0; //production
        }else{
            $live_mode = 1; //development
        }
        $telr_api_url = "https://secure.telr.com/gateway/order.json";
        $store_id = "31610"; 
        $auth_key = "RCLW5-6hfp@5ZvSr";
        $return_auth_url = site_url('/payment-success/');
        $return_decl_url = site_url('/payment-cancel/');
        $return_can_url = site_url('/payment-cancel/');
        $telr_request = [
            'ivp_method' => 'create',
            'ivp_store' => $store_id,
            'ivp_authkey' => $auth_key,
            'ivp_cart' => $booking_uuid,
            'ivp_amount' => $amount,
            'ivp_currency' => $currency,
            'ivp_desc' => "Booking payment",
            'ivp_test' => $live_mode,
            'return_auth' => $return_auth_url . "?booking_uuid=" . urlencode($booking_uuid),
            'return_decl' => $return_decl_url . "?booking_uuid=" . urlencode($booking_uuid),
            'return_can' => $return_can_url . "?booking_uuid=" . urlencode($booking_uuid),
        ];
        $telr_response = wp_remote_post($telr_api_url, [
            'body' => $telr_request,
        ]);
        if (is_wp_error($telr_response)) {
            wp_send_json_error(['message' => 'Failed to initiate Telr payment.', 'error' => $telr_response->get_error_message()]);
            return;
        }
        $telr_response_body = json_decode(wp_remote_retrieve_body($telr_response), true);
        if (!empty($telr_response_body['order']['url'])) {
            wp_send_json_success(['redirect_url' => $telr_response_body['order']['url']]);
        } else {
            wp_send_json_error(['message' => 'Failed to create Telr payment session.', 'response' => $telr_response_body]);
        }
        wp_send_json_success($response);
    } else {
        wp_send_json_error(['message' => 'Failed to complete checkout.']);
    }
}
add_action('wp_ajax_bokun_checkout_submit', 'bokun_checkout_submit_handler');
add_action('wp_ajax_nopriv_bokun_checkout_submit', 'bokun_checkout_submit_handler'); 
