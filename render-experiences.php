<?php
function formatDurationText($durationText)
{
    $formatted = str_replace(['hours', 'and', 'minutes'], ['h', ',', 'min'], $durationText);
    return trim(preg_replace('/\s+/', ' ', $formatted));
}
function renderBokunHeader()
{
    return '
    <header class="custom-bokun-header">
        <input type="text" id="search-bar" class="custom-bokun-search-bar" placeholder="Search for activities">
        <input type="text" id="date-range" class="custom-bokun-date-range" name="daterange" placeholder="When are you going?" />
    </header>
    <div class="custom-bokun-selected-dates" style="display: none;">
        <div class="custom-bokun-left-section">
            <span class="custom-bokun-date-display">Date from: <span id="start-date">Not Specified</span> 
                <button id="clear-start">✖</button>
            </span>
            <span class="custom-bokun-date-display">Date to: <span id="end-date">Not Specified</span> 
                <button id="clear-end">✖</button>
            </span>
        </div>
        <div class="custom-bokun-right-section">
            <span class="custom-bokun-product-count">Found <span id="custom-bokun-product-count">0</span> products</span>
        </div>
    </div>';
}
function renderExperienceCard($experience)
{
    $experience_id = htmlspecialchars($experience['id'] ?? '');
    $title = htmlspecialchars($experience['title'] ?? 'No Title');
    $excerpt = htmlspecialchars($experience['excerpt'] ?? 'No description available.');
    $image = isset($experience['photos'][0]['derived'][2]['url']) ? htmlspecialchars($experience['photos'][0]['derived'][2]['url']) : '';
    $price = (float)htmlspecialchars(trim($experience['price']));
    $durationText = htmlspecialchars(formatDurationText($experience['durationText'] ?? 'Duration not available'));
    $date = htmlspecialchars($experience['date'] ?? '');
    $direct_link = home_url('?act='.$experience_id);
    $rating = (float)htmlspecialchars($experience['tripadvisorReview']['rating'] ?? 0); // Default to 0 if not set
    $numReviews = (int)htmlspecialchars($experience['tripadvisorReview']['numReviews'] ?? 0); // Default to 0 if not set
    // Conditional rendering for the rating section
    $ratingSection = '';
    if ($rating > 0) {
        $ratingSection = '
            <div class="custom-bokun-rating-container">
                <img src="' . plugin_dir_url(__FILE__) . 'bokun_images/reviews.svg" alt="">
                <div class="custom-bokun-rating-circles" data-rating="' . $rating . '" data-total-circles="5"></div>
                <div class="custom-bokun-review-count">
                    <p class="custom-bokun-review-link">
                        <span class="custom-bokun-review-count-value" data-reviews="' . $numReviews . '">' . $numReviews . '</span> reviews
                    </p>
                </div>
            </div>';
    }
    return '
    <div class="custom-bokun-card ' . (empty($price) ? "hidden" : "") . '" data-title="' . strtolower($title) . '" ' . ($date ? 'data-date="' . $date . '"' : '') . ' data-experience-id="' . $experience_id . '">
        <span class="open-direct-link" data-url="'. $direct_link .'"><i class="fa fa-external-link"></i></span>    
        <img src="' . $image . '" alt="' . $title . '" class="custom-bokun-card-img">
        <div class="custom-bokun-card-content">
            <h3 class="custom-bokun-card-title">' . $title . '</h3>
            <p class="custom-bokun-author">By Atlas</p>
            ' . $ratingSection . '
            <p class="custom-bokun-description">' . $excerpt . '</p>
            <div class="custom-bokun-card-footer">
                <div class="custom-bokun-duration">
                    <img src="' . plugin_dir_url(__FILE__) . 'bokun_images/clock.svg" alt="Clock" width="16" height="16">
                    <span>' . $durationText . '</span>
                </div>
                <p class="custom-bokun-price">
                    From
                    <span class="custom-bokun-from-style">Loading...</span> 
                </p>
            </div>
        </div>
    </div>';
}
function renderBokunExperiences($experiences, $container_id = 'bokun_exp_container')
{
    if (!isset($experiences['items']) || empty($experiences['items'])) {
        return '<p class="empty-container">No experiences available.</p>';
    }
    $output = '<div id="' . $container_id . '"><div class="custom-bokun-container">';
    foreach ($experiences['items'] as $experience) {
        $output .= renderExperienceCard($experience);
    }
    $output .= '</div></div>';
    return $output;
}
function fetchExperiences($searchQuery = '', $startDate = '', $endDate = '', $pageSize = 50, $currency, $lang)
{
    $method = 'POST';
    $body = [
        "page" => 1,
        "pageSize" => $pageSize,
        "sortOrder" => "ASC",
    ];
    if (!empty($startDate)) {
        $body['startDate'] = $startDate;
    }
    if (!empty($endDate)) {
        $body['endDate'] = $endDate;
    }
    if (!empty($searchQuery)) {
        $body['textFilter'] = [
            'searchExternalId' => true,
            'searchFullText' => true,
            'searchKeywords' => true,
            'searchTitle' => true,
            'text' => $searchQuery,
            'wildcard' => true,
        ];
    }
    $path = '/activity.json/search?currency=' . $currency . '&lang=' . $lang;
    return authenticateBokunApi($method, $path, $body);
}
function displayExperiences($searchQuery = '', $startDate = '', $endDate = '', $pageSize = 50)
{
    $currency = sanitize_text_field($_POST['currency'] ?? '');
    $language = sanitize_text_field($_POST['lang'] ?? '');
    // Generate a unique cache key based on the parameters
    $cache_key = 'bokun_experiences_' . md5($searchQuery . $startDate . $endDate . $pageSize) . "_new";
    if (empty($searchQuery) && empty($startDate) && empty($endDate)) {
        // Try to retrieve cached experiences
        $experiences = get_transient($cache_key);
        // If not found in cache, fetch fresh data
        if (false === $experiences) {
            $experiences = fetchExperiences($searchQuery, $startDate, $endDate, $pageSize, $currency, $language);
            // If successful, cache the result for 1 hour
            if ($experiences) {
                set_transient($cache_key, $experiences, DAY_IN_SECONDS);
            }
        }
    } else {
        $experiences = fetchExperiences($searchQuery, $startDate, $endDate, $pageSize, $currency, $language);
    }
    // If experiences are available, render them; otherwise return an error message
    return $experiences ? renderBokunExperiences($experiences) : '<p>Failed to fetch experiences. Please try again later.</p>';
}
add_action('wp_ajax_fetch_experiences_by_date', 'fetch_experiences_by_date');
add_action('wp_ajax_nopriv_fetch_experiences_by_date', 'fetch_experiences_by_date');
function fetch_experiences_by_date()
{
    $search_query = sanitize_text_field($_POST['search_query'] ?? '');
    $startDate = sanitize_text_field($_POST['startDate'] ?? '');
    $endDate = sanitize_text_field($_POST['endDate'] ?? '');
    $experiences = displayExperiences($search_query, $startDate, $endDate);
    wp_send_json_success($experiences);
}
add_action('wp_ajax_fetch_experiences_by_product', 'fetch_experiences_by_product');
add_action('wp_ajax_nopriv_fetch_experiences_by_product', 'fetch_experiences_by_product');
function fetch_experiences_by_product()
{
    $product_id = sanitize_text_field($_POST['product_id'] ?? '');
    $currency = sanitize_text_field($_POST['currency'] ?? '');
    $language = sanitize_text_field($_POST['lang'] ?? '');
    // If no product ID is provided, fetch all experiences
    if (empty($product_id)) {
        $defaultExperiences = fetchExperiences('', '', '', 50, $currency, $language); // Your custom function to fetch default experiences
        wp_send_json_success(renderBokunExperiences($defaultExperiences));
        return;
    }
    // Construct the request path
    $path = '/product-list.json/' . $product_id . "?currency=$currency&lang=$language";
    $method = 'GET';
    // Create a unique cache key based on the path
    $cache_key = 'bokun_api_' . md5($path);
    // Try to get cached data
    $response = get_transient($cache_key);
    // If no cached data found, call the API and cache the response
    if (false === $response) {
        $response = authenticateBokunApi($method, $path);
        // Cache the response for one hour if it's valid
        if ($response && isset($response['items'])) {
            set_transient($cache_key, $response, DAY_IN_SECONDS);
        }
    }
    // Process the response
    if ($response && isset($response['items']) && !empty($response['items'])) {
        $activities = array_filter(array_column($response['items'], 'activity'));
        if (!empty($activities)) {
            $container_id = 'bokun_exp_container_' . $product_id;
            $title = $response['title'] ?? 'Related Experiences';
            // Add a title and back button
            $html = '
            <div class="custom-bokun-header" style="display:flex;align-items:baseline;">
                <button style="background:transparent; border:none; cursor:pointer;color:#000;" id="custom-bokun-back-btn">← Back</button>
                <h5 class="custom-bokun-title">' . esc_html($title) . '</h5>
            </div>';
            $html .= renderBokunExperiences(['items' => $activities], $container_id);
            wp_send_json_success($html);
        } else {
            wp_send_json_error('No activities found for this product.');
        }
    } else {
        wp_send_json_error('No experiences found for this product.');
    }
}
add_shortcode('bokun_experiences', function () {
    return renderBokunHeader() . displayExperiences();
});
