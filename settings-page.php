<?php
// =========================================
// SETTINGS PAGE FOR GOOGLE MAPS API KEY AND BOKUN MODE
// =========================================
// 1. Add menu page
function custom_bokun_add_admin_menu()
{
    add_menu_page(
        __('Bokun Settings', 'custom-bokun'),
        __('Bokun Settings', 'custom-bokun'),
        'manage_options',
        'custom-bokun-settings',
        'custom_bokun_settings_page_html',
        'dashicons-admin-generic',
        100
    );
}
add_action('admin_menu', 'custom_bokun_add_admin_menu');
// 2. Register settings, section, and fields
function custom_bokun_register_settings()
{
    register_setting('custom_bokun_settings_group', 'google_maps_api_key', [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => ''
    ]);
    register_setting('custom_bokun_settings_group', 'bokun_mode', [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => 'test'
    ]);
    add_settings_section(
        'custom_bokun_settings_section',
        __('Google Maps API and Bokun Settings', 'custom-bokun'),
        'custom_bokun_settings_section_callback',
        'custom-bokun-settings'
    );
    add_settings_field(
        'google_maps_api_key_field',
        __('Google Maps API Key', 'custom-bokun'),
        'custom_bokun_settings_api_key_field_callback',
        'custom-bokun-settings',
        'custom_bokun_settings_section'
    );
    add_settings_field(
        'bokun_mode_field',
        __('Bokun Mode', 'custom-bokun'),
        'custom_bokun_settings_mode_field_callback',
        'custom-bokun-settings',
        'custom_bokun_settings_section'
    );
}
add_action('admin_init', 'custom_bokun_register_settings');
// 3. Callbacks for section and fields
function custom_bokun_settings_section_callback()
{
    echo '<p>' . __('Enter your Google Maps API key and choose Bokun mode (Test or Live).', 'custom-bokun') . '</p>';
}
function custom_bokun_settings_api_key_field_callback()
{
    $api_key = get_option('google_maps_api_key', '');
    echo '<input type="text" name="google_maps_api_key" value="' . esc_attr($api_key) . '" style="width: 350px;" />';
}
function custom_bokun_settings_mode_field_callback()
{
    $mode = get_option('bokun_mode', 'test');
    ?>
    <select name="bokun_mode" style="width: 200px;">
        <option value="test" <?php selected($mode, 'test'); ?>>Test Mode</option>
        <option value="live" <?php selected($mode, 'live'); ?>>Live Mode</option>
    </select>
    <p class="description"><?php _e('Select "Live Mode" to enable real Bokun API calls.', 'custom-bokun'); ?></p>
    <?php
}
// 4. Render the settings page HTML
function custom_bokun_settings_page_html()
{
    if (!current_user_can('manage_options')) {
        return;
    }
?>
    <div class="wrap">
        <h1><?php _e('Custom Bokun Plugin Settings', 'custom-bokun'); ?></h1>
        <form action="options.php" method="post">
            <?php
            settings_fields('custom_bokun_settings_group');
            do_settings_sections('custom-bokun-settings');
            submit_button();
            ?>
        </form>
    </div>
<?php
}
