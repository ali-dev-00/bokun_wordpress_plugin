<?php
// Hook for creating the bookings table
register_activation_hook(__FILE__, 'create_bookings_table');
function create_bookings_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'bookings';
    $charset_collate = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        booking_uuid VARCHAR(255) NOT NULL,
        confirmation_code VARCHAR(255),
        booking_status VARCHAR(50),
        payment_status VARCHAR(50),
        currency VARCHAR(10),
        total_price DECIMAL(10, 2),
        product_invoices LONGTEXT NOT NULL, 
        telr_transaction_id VARCHAR(50) NULL,
        created_at DATETIME NOT NULL,
        UNIQUE (booking_uuid)
    ) $charset_collate;";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}
// Hook for creating the cart sessions table
register_activation_hook(__FILE__, 'create_cart_sessions_table');
function create_cart_sessions_table()
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'cart_sessions';
    $charset_collate = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        session_id VARCHAR(255) NOT NULL UNIQUE,
        user_id BIGINT(20) UNSIGNED NULL DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NULL,
        PRIMARY KEY (id)
    ) $charset_collate;";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}
