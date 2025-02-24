<?php
function renderProductExperiences($experiences, $container_id = 'bokun_exp_container')
{
   
    if (!isset($experiences['items']) || empty($experiences['items'])) {
        return '<p class="empty-container" style="color:black;">No experiences available.</p>';
        
    }
    $output = '<div id="' . $container_id . '"><div class="custom-bokun-container">';
    foreach ($experiences['items'] as $experience) {
        $single_experiece =  ($experience['activity']);
        $output .= renderExperienceCard($single_experiece);
        
    }
    $output .= '</div></div>';
    return $output;
}


function fetch_Product_list_byid()
{
    $method = 'GET';

 
    $id = 0;
    $url = $_SERVER['REQUEST_URI'];

    if (strpos($url, '/tickets/') !== false) {
        $id = 75805;
    } elseif (strpos($url, '/city-tours/') !== false) {
        $id = 75816;
    } elseif (strpos($url, '/cruise/') !== false) {
        $id = 82244;
    } elseif (strpos($url, '/safari/') !== false) {
        $id = 82312;
    } elseif (strpos($url, '/tour-transportation/') !== false) {
        $id = 68365;
    }

    if ($id === 0) {
        return '<p>Invalid category. No product ID found.</p>';
    }

    $path = "/product-list.json/$id";
    $cache_key = 'bokun_api_products_byid_' . md5($path);
    $experiences = get_transient($cache_key);

    if (false === $experiences) {
        $experiences = authenticateBokunApi($method, $path);
        
        if ($experiences) {
            set_transient($cache_key, $experiences, DAY_IN_SECONDS);
        } else {
            error_log('Failed to fetch experiences from Bokun API.');
            return '<p>Failed to fetch experiences. Please try again later.</p>';
        }
    }

    if ($experiences) {
        return renderProductExperiences($experiences);
    }

    error_log('Failed to fetch or find experiences.');
    return '<p>No experiences found. Check API or debug logs for details.</p>';
}

add_shortcode('single_product_List', 'fetch_Product_list_byid');
