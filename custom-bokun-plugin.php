<?php
/*
Plugin Name: Custom Bokun Plugin
Plugin URI: https://example.com
Description: Fetch and display products from Bokun's API.
Version: 1.0
Author: Your Name
Author URI: https://example.com
License: GPL2
*/
if (!defined('ABSPATH')) {
    exit;
}
// Plugin activation hook
function custom_bokun_activate()
{
    add_option('custom_bokun_plugin_active', true);
}
register_activation_hook(__FILE__, 'custom_bokun_activate');
// Plugin deactivation hook
function custom_bokun_deactivate()
{
    delete_option('custom_bokun_plugin_active');
}
register_deactivation_hook(__FILE__, 'custom_bokun_deactivate');
function telr_payment_success_shortcode()
{
    global $wpdb;
// Retrieve query parameters sent by Telr
$booking_uuid = sanitize_text_field($_GET['booking_uuid'] ?? '');
$status = sanitize_text_field($_GET['status'] ?? '');
if (empty($booking_uuid)) {
    return '<p>Error: Missing booking UUID.</p>';
}
// Fetch booking details from the database
$table_name = $wpdb->prefix . 'bookings';
$booking = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM $table_name WHERE booking_uuid = %s",
    $booking_uuid
));
if (!$booking) {
    return '<p>Error: Booking not found for the provided booking UUID.</p>';
}
$confirmation_code = $booking->confirmation_code;
$bokun_mode = get_option('bokun_mode', 'test');
$confirmation_message = '';
if ($bokun_mode === 'live') {
   
    // Confirm booking via Bokun API
    $confirmation_result = confirm_booking_bokun_api($confirmation_code, $currency, $language);
    if ($confirmation_result['success']) {
        // Update the booking status to 'CONFIRMED' if payment_status is 'paid'
        $update_result = $wpdb->update(
            $table_name,
            ['booking_status' => 'CONFIRMED'], // Columns to update
            ['booking_uuid' => $booking_uuid, 'payment_status' => 'paid'], // WHERE clause
            ['%s'], // Data format for booking_status
            ['%s', '%s'] // Data format for WHERE clause
        );
        if ($update_result !== false) {
            $confirmation_message = "<p>Your Booking has been Successfully Confirmed. <br> Confirmation Code: <strong>{$confirmation_code}</strong></p>";
        } else {
            $confirmation_message = '<p>Error: Failed to update the booking status in the database.</p>';
        }
    } else {
        $confirmation_message = '<p>Error: Failed to confirm the booking with Bokun API.</p>';
        $confirmation_message .= '<p>' . esc_html($confirmation_result['message']) . '</p>';
    }
} else {
    
    $confirmation_message = '<p><strong>Note:</strong> Bokun is currently in <strong>Test Mode</strong>. No API confirmation was made.</p>';
}
    $product_invoices = json_decode($booking->product_invoices, true);
    ob_start();
?>
    <div class="custom-bokun-content">
        <!-- Thank You Message Section -->
        <div class="custom-bokun-thank-you-message">
            <h1>Thank You for Your Payment!</h1>
            <p>Your payment has been successfully processed. Please find the details below:</p>
        </div>
        <!-- Payment Details Section -->
        <div class="custom-bokun-payment-details">
            <h2>Payment Summary</h2>
            <div class="custom-bokun-payment-summary">
                <p><strong>Booking ID:</strong> <?php echo esc_html($confirmation_code); ?></p>
                <p><strong>Total Amount Paid:</strong> AED <?php echo esc_html(number_format($booking->total_price, 2)); ?></p>
            </div>
        </div>
        <!-- Confirmation Message -->
        <div class="custom-bokun-confirmation-message">
            <?php echo $confirmation_message; ?>
        </div>
        <!-- Booking Details Section -->
        <div class="custom-bokun-booking-details">
            <h2>Your Booking</h2>
            <?php if (!empty($product_invoices)) : ?>
                <?php foreach ($product_invoices as $product) : ?>
                    <div class="custom-bokun-booking-summary">
                        <!-- Display Product Image -->
                        <?php if (!empty($product['product']['keyPhoto']['originalUrl'])) : ?>
                            <img src="<?php echo esc_url($product['product']['keyPhoto']['originalUrl']); ?>" alt="<?php echo esc_attr($product['product']['title'] ?? 'Tour Image'); ?>" class="custom-bokun-tour-image">
                        <?php else : ?>
                            <img src="<?php echo esc_url(plugins_url('assets/img/default-tour-image.jpg', __FILE__)); ?>" alt="Default Tour Image" class="custom-bokun-tour-image">
                        <?php endif; ?>
                        <!-- Booking Information -->
                        <div>
                            <h3><?php echo esc_html($product['product']['title'] ?? 'Tour Title Unavailable'); ?></h3>
                            <p><strong>Departure:</strong> <?php echo esc_html($product['dates'] ?? 'N/A'); ?></p>
                            <p><strong>Price:</strong> <?php echo esc_html($product['totalAsText'] ?? 'N/A'); ?></p>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else : ?>
                <p>No products found in your booking.</p>
            <?php endif; ?>
        </div>
    </div>
<?php
    return ob_get_clean();
}
add_shortcode('telr_payment_success', 'telr_payment_success_shortcode');
function confirm_booking_bokun_api($confirmation_code, $currency, $price)
{
    if (empty($confirmation_code) || empty($currency) || empty($price)) {
        return ['success' => false, 'message' => 'Missing required parameters for Bokun confirmation.'];
    }
    $method = 'POST';
    $body = [
    "showPricesInNotification"=> true,
    "sendNotificationToMainContact"=> true,
    'amount' => $price,
    'currency'=> $currency,
    ];
    $path = "/checkout.json/confirm-reserved/{$confirmation_code}";
    $details = authenticateBokunApi($method, $path,$body);
  
    if ($details) {
        return ['success' => true, 'details' => $details];
    } else {
        return ['success' => false, 'message' => 'Bokun API request failed.'];
    }
}
function telr_payment_cancel_shortcode()
{
    global $wpdb;
    // Retrieve all parameters sent by Telr
    $response_data = [];
    foreach ($_GET as $key => $value) {
        $response_data[$key] = sanitize_text_field($value);
    }
    // Extract specific values from the response
    $cart_id = $response_data['ivp_cart'] ?? '';
    $status = $response_data['status'] ?? 'unknown';
    if (empty($cart_id)) {
        return '';
    }
    // Fetch booking details from the database
    $table_name = $wpdb->prefix . 'bookings';
    $booking = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE booking_uuid = %s",
        $cart_id
    ));
    if (!$booking) {
        return '<p>Error: Booking not found.</p>';
    }
    // Format the cancel/failed response data
    $message = $status === 'declined' ? 'Payment Declined' : 'Payment Canceled';
    $formatted_response = '<h1>' . esc_html($message) . '</h1>';
    $formatted_response .= '<p>Details from Telr:</p><ul>';
    foreach ($response_data as $key => $value) {
        $formatted_response .= '<li><strong>' . esc_html($key) . ':</strong> ' . esc_html($value) . '</li>';
    }
    $formatted_response .= '</ul>';
    return $formatted_response;
}
add_shortcode('telr_payment_cancel', 'telr_payment_cancel_shortcode');
// Include required files
require_once plugin_dir_path(__FILE__) . 'create-db-tables.php';
require_once plugin_dir_path(__FILE__) . 'create-api-signature.php';
require_once plugin_dir_path(__FILE__) . 'render-experiences.php';
require_once plugin_dir_path(__FILE__) . 'render-products.php';
require_once plugin_dir_path(__FILE__) . 'experience-detail-modal.php';
require_once plugin_dir_path(__FILE__) . 'cart-session-functions.php';
require_once plugin_dir_path(__FILE__) . 'settings-page.php';
// Define default language and currency in PHP constants
$default_currency = 'AED';
define('BOKUN_LANGUAGE', 'en');
define('BOKUN_CURRENCY', 'AED');
// Enqueue styles and scripts
function enqueue_bokun_assets()
{
    // Enqueue custom plugin styles
    wp_enqueue_style(
        'custom-bokun-style',
        plugins_url('css/style.css', __FILE__),
        [],
        '1.0'
    );
    wp_enqueue_style(
        'custom-bokun-calender',
        plugins_url('css/calendar.css', __FILE__),
        [],
        '1.0'
    );
    wp_enqueue_style(
        'custom-bokun-checkoutmodal',
        plugins_url('css/checkout-modal.css', __FILE__),
        [],
        '1.0'
    );
    wp_enqueue_style(
        'custom-number-picker-style',
        'https://cdn.jsdelivr.net/npm/intl-tel-input@17.0.8/build/css/intlTelInput.css',
        [],
        null
    );
    // Enqueue Moment.js
    wp_enqueue_script(
        'moment-js',
        'https://cdn.jsdelivr.net/momentjs/latest/moment.min.js',
        [],
        null,
        true
    );
    // Enqueue Date Range Picker
    wp_enqueue_script(
        'daterangepicker-js',
        'https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js',
        ['moment-js'],
        null,
        true
    );
    wp_enqueue_style(
        'daterangepicker-css',
        'https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css',
        [],
        null
    );
    // Enqueue custom plugin scripts
    wp_enqueue_script(
        'custom-bokun-script',
        plugins_url('js/custom-bokun.js', __FILE__),
        ['jquery', 'moment-js', 'daterangepicker-js'],
        '1.0',
        true
    );
    wp_enqueue_script(
        'custom-maps-script',
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyCGqKZNLYcJ6t0h4Emq9o8-cpAKR6nU7sM',
        [],
        null
    );
    wp_enqueue_script(
        'custom-number-picker-script',
        'https://cdn.jsdelivr.net/npm/intl-tel-input@17.0.8/build/js/intlTelInput.min.js',
        [],
        null,
        true // Load in the footer for better performance
    );
    wp_enqueue_script(
        'custom-modal',
        plugins_url('js/custom-modal.js', __FILE__),
        ['jquery'],
        '1.0',
        true
    );
    wp_enqueue_script(
        'checkout-modal',
        plugins_url('js/checkout-modal.js', __FILE__),
        ['jquery'],
        '1.0',
        true
    );
    wp_enqueue_script(
        'cart-session-functions',
        plugins_url('js/cart-session-functions.js', __FILE__),
        ['jquery'],
        '1.0',
        true
    );
    // Pass constants to JavaScript
    wp_localize_script('custom-bokun-script', 'bokunAjax', [
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'defaultLanguage' => BOKUN_LANGUAGE,
        'defaultCurrency' => BOKUN_CURRENCY,
    ]);
}
add_action('wp_enqueue_scripts', 'enqueue_bokun_assets');
add_action('wp_ajax_fetch_pickup_places', 'handle_fetch_pickup_places');
add_action('wp_ajax_nopriv_fetch_pickup_places', 'handle_fetch_pickup_places');
function handle_fetch_pickup_places($default_currency = 'AED', $default_lang = 'en')
{
    // Validate the AJAX request
    if (empty($_POST['experience_id'])) {
        wp_send_json_error(['message' => 'Experience ID is missing.']);
        return;
    }
    $experience_id = sanitize_text_field($_POST['experience_id']);
    // Define API path and cache key
    $path = "/activity.json/{$experience_id}/pickup-places?currency=$default_currency&lang=$default_lang";
    $cache_key = 'bokun_api_exp_list_' . md5($path);
    $method = 'GET';
    // Check for cached data
    $pickups = get_transient($cache_key);
    if (false === $pickups) {
        // Fetch data from Bokun API
        $pickups = authenticateBokunApi($method, $path);
        if (!$pickups) {
            error_log('Failed to fetch pickups from Bokun API.');
            wp_send_json_error(['message' => 'Failed to fetch pickup places.']);
            return;
        }
        // Cache the response for 1 hour
        set_transient($cache_key, $pickups, DAY_IN_SECONDS);
    }
    // Generate HTML response
    ob_start();
    if (!empty($pickups['pickupPlaces'])) {
        foreach ($pickups['pickupPlaces'] as $pickup) {
            $title = htmlspecialchars($pickup['title'] ?? 'Unknown Title');
            echo "<li>{$title}</li>";
        }
    } else {
        echo '<li>No pickup places found.</li>';
    }
    $html = ob_get_clean();
    wp_send_json_success(['html' => $html]);
}
add_action('wp_ajax_fetch_experience_availability', 'fetch_experience_availability_handler');
add_action('wp_ajax_nopriv_fetch_experience_availability', 'fetch_experience_availability_handler');
function fetch_experience_availability_handler()
{
    $experience_id = sanitize_text_field($_POST['experience_id'] ?? '');
    $start_date = sanitize_text_field($_POST['start_date'] ?? '');
    $end_date = sanitize_text_field($_POST['end_date'] ?? '');
    $currency = sanitize_text_field($_POST['currency'] ?? '');
    $language = sanitize_text_field($_POST['language'] ?? '');
    if (!$experience_id || !$start_date || !$end_date || !$currency || !$language) {
        wp_send_json_error(['message' => 'Missing parameters.']);
        return;
    }
    $path = "/activity.json/{$experience_id}/availabilities?start={$start_date}&end={$end_date}&currency={$currency}&lang={$language}&includeSoldOut=false";
    $method = 'GET';
    $availability = authenticateBokunApi($method, $path);
    if ($availability) {
        wp_send_json_success(['availabilities' => $availability]);
    } else {
        wp_send_json_error(['message' => 'Failed to fetch availability.']);
    }
}
add_action('wp_ajax_fetch_experience_prices', '_fetch_experience_prices');
add_action('wp_ajax_nopriv_fetch_experience_prices', '_fetch_experience_prices');
function _fetch_experience_prices()
{
    $experience_ids = $_POST['experience_ids'];
    $default_currency = isset($_POST['currency']) && !empty($_POST['currency']) ? sanitize_text_field($_POST['currency']) : BOKUN_CURRENCY;
    $default_lang     = isset($_POST['language']) && !empty($_POST['language']) ? sanitize_text_field($_POST['language']) : BOKUN_LANGUAGE;
    if (empty($experience_ids)) {
        wp_send_json_error(['message' => 'Nothing was found.']);
    }
    $experience_prices_array = [];
    foreach ($experience_ids as $key => $experience_id) {
        $experience_id = sanitize_text_field($experience_id);
        $path = '/activity.json/' . $experience_id . '?currency=' . $default_currency . '&lang=' . $default_lang;
        $method = 'GET';
        $cache_key = 'bokun_experience_details_' . md5($experience_id . $path);
        $method = 'GET';
        $experience = get_transient($cache_key);
        if (false === $experience) {
            $experience = authenticateBokunApi($method, $path);
            if (!$experience) {
                continue;
            }
            set_transient($cache_key, $experience, DAY_IN_SECONDS);
        }
        if (is_array($experience)) {
            // Hide pricedPerPerson Activities.
            $rates = $experience['rates'];
            $rate  = reset($rates);
            $per_person = false;
            if(isset($rate['pricedPerPerson']) && $rate['pricedPerPerson'] == true){
                $per_person = true;
            }

            $price = $experience['price'] ??
            $experience['nextDefaultPrice'] ??
            $experience['originalDefaultPrice'] ?? 0;
            $price = number_format($price, 2);

            $experience_prices_array[$experience_id] = [
                'price' => $price,
                'currency' => $default_currency,
                'pricedPerPerson' => $per_person
            ];
        }
    }
    if (count($experience_prices_array)) {
        wp_send_json_success($experience_prices_array);
    } else {
        wp_send_json_error(['message' => 'Failed to fetch prices.']);
    }
}
add_action('wp_ajax_checkout_pick_up_places', 'checkout_pick_up_places');
add_action('wp_ajax_nopriv_checkout_pick_up_places', 'checkout_pick_up_places');
function checkout_pick_up_places($language = 'en', $currency = 'AED')
{
    // Validate the AJAX request
    if (empty($_POST['experience_id'])) {
        wp_send_json_error(['message' => 'Experience ID is missing.']);
        return;
    }
    // Sanitize input data
    $experience_id = sanitize_text_field($_POST['experience_id']);
    $currency = sanitize_text_field($_POST['currency'] ?? $currency);
    $language = sanitize_text_field($_POST['language'] ?? $language);
    // Define API path
    $path = "/activity.json/{$experience_id}/pickup-places?currency=$currency&lang=$language";
    $method = 'GET';
    // Call the Bokun API
    $response = authenticateBokunApi($method, $path);
    // Handle API response
    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()]);
        return;
    }
    if (empty($response['pickupPlaces'])) {
        wp_send_json_error(['message' => 'No pickup places found.']);
        return;
    }
    wp_send_json_success(['pickupPlaces' => $response['pickupPlaces']]);
}
function printR($data, $die = true)
{
    echo "<pre>";
    print_r($data);
    echo "</pre>";
    if ($die) {
        die;
    }
}



function fetch_experience_details_v2()
{
    // Validate required fields
    if (!isset($_POST['experience_id'], $_POST['currency'], $_POST['language']) || empty($_POST['experience_id']) || empty($_POST['currency']) || empty($_POST['language'])) {
        wp_send_json_error(['message' => 'Missing required parameters.']);
    }

    $experience_id = sanitize_text_field($_POST['experience_id']);
    $currency = sanitize_text_field($_POST['currency']);
    $lang = sanitize_text_field($_POST['language']);  
    
    $path = '/activity.json/' . $experience_id . '?currency=' . $currency . '&lang=' . $lang;
    $method = 'GET';

    $cache_key = 'bokun_experience_details_' . md5($experience_id . $path);
    
    $response = get_transient($cache_key);
    
    if (false === $response) {
        $response = authenticateBokunApi($method, $path);
        if ($response) {
            set_transient($cache_key, $response, DAY_IN_SECONDS); 
        }
    }
    if ($response) {
        wp_send_json_success($response);
    } else {
        wp_send_json_error(['message' => 'Failed to fetch experience details or missing data.']);
    }
}

add_action('wp_ajax_fetch_experience_details_v2', 'fetch_experience_details_v2');
add_action('wp_ajax_nopriv_fetch_experience_details_v2', 'fetch_experience_details_v2');



function fetch_experience_price_list() {
    if (!isset($_POST['experience_id']) || !isset($_POST['currency'])) {
        wp_send_json_error(['message' => 'Missing required parameters.']);
        return;
    }

    $experience_id = sanitize_text_field($_POST['experience_id']);
    $currency = sanitize_text_field($_POST['currency']);

    $path = "/activity.json/{$experience_id}/price-list?currency={$currency}";
    $method = 'GET';
    $cache_key = 'fetch_experience_prices_' . md5($experience_id . $path);
    $response = get_transient($cache_key);
    if (false === $response) {
        $response = authenticateBokunApi($method, $path);

        if ($response) {
            set_transient($cache_key, $response, HOUR_IN_SECONDS);
        }
    }
    if ($response) {
        wp_send_json_success($response);
    } else {
        wp_send_json_error(['message' => 'Failed to fetch experience details or missing data.']);
    }
}

// Register AJAX actions
add_action('wp_ajax_fetch_experience_price_list', 'fetch_experience_price_list');
add_action('wp_ajax_nopriv_fetch_experience_price_list', 'fetch_experience_price_list');

function get_stored_data() {
    if (!isset($_POST['session_id']) || empty($_POST['session_id'])) {
        wp_send_json_error(['message' => 'Session ID not found.']);
    }

    $session_id = sanitize_text_field($_POST['session_id']);
    
    // Fetch both transients
    $contact_transient_key = "contact_details_cartSessionID_" . $session_id;
    $tab_transient_key = "tab_data_cartSessionID_" . $session_id;

    $stored_contact_data = get_transient($contact_transient_key) ?: [];
    $stored_tab_data = get_transient($tab_transient_key) ?: [];

    wp_send_json_success([
        'activityTabData' => $stored_tab_data['activityTabData'] ?? [],
        'mainContactDetails' => $stored_contact_data['mainContactDetails'] ?? [],
    ]);
}

add_action('wp_ajax_get_stored_data', 'get_stored_data');
add_action('wp_ajax_nopriv_get_stored_data', 'get_stored_data');



function store_activity_tab_data() {
    $session_id = sanitize_text_field($_POST['session_id'] ?? '');

    // Get raw activity data without decoding it
    $activity_data = wp_unslash($_POST['activityTabData'] ?? '');

    if (empty($session_id)) {
        wp_send_json_error(['message' => '❌ Session ID is required.']);
    }

    if (empty($activity_data)) {
        wp_send_json_error(['message' => '⚠️ No valid activity data received.']);
    }

    // Save as raw text in transient storage
    $transient_key = "tab_data_cartSessionID_" . $session_id;
    set_transient($transient_key, ['activityTabData' => $activity_data], HOUR_IN_SECONDS);

    wp_send_json_success([
        'message' => '✅ Activity data stored successfully.',
        'activityTabData' => $activity_data
    ]);
}

add_action('wp_ajax_store_activity_tab_data', 'store_activity_tab_data');
add_action('wp_ajax_nopriv_store_activity_tab_data', 'store_activity_tab_data');






function store_main_contact_details() {
    if (!isset($_POST['session_id']) || empty($_POST['session_id'])) {
        wp_send_json_error(['message' => 'Session ID not found.']);
    }

    $session_id = sanitize_text_field($_POST['session_id']);
    $transient_key = "contact_details_cartSessionID_" . $session_id;
    $existing_data = get_transient($transient_key) ?: [];

    if (isset($_POST['mainContactDetails'])) {
        $main_contact_data = json_decode(stripslashes($_POST['mainContactDetails']), true);
        if (!is_array($main_contact_data)) {
            wp_send_json_error(['message' => 'Invalid mainContactDetails format.']);
        }

        $existing_data['mainContactDetails'] = $main_contact_data;
    }

    set_transient($transient_key, $existing_data, 3600);
    wp_send_json_success(['mainContactDetails' => $existing_data['mainContactDetails']]);
}
add_action('wp_ajax_store_main_contact_details', 'store_main_contact_details');
add_action('wp_ajax_nopriv_store_main_contact_details', 'store_main_contact_details');
