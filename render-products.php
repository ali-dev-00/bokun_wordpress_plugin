<?php
function renderBokunProducts($products)
{
    // Find the "PRODUCT LIST" and extract its children
    $productListChildren = [];
    foreach ($products as $product) {
        if ($product['title'] === "PRODUCT LIST" && !empty($product['children'])) {
            $productListChildren = $product['children']; // Get "children" array
            break;
        }
    }

    if (empty($productListChildren)) {
        return '<p>No products found in "PRODUCT LIST".</p>';
    }

    // Render children of "PRODUCT LIST"
    $output = '<div class="custom-bokun-cards-wrapper">';
    foreach ($productListChildren as $product) {
        $images = $product['photos'] ?? [];
        $title = htmlspecialchars($product['title'] ?? 'No Title');
        $size = htmlspecialchars($product['size'] ?? '0');
        $experiences = $size . ' Experiences';
        $product_id = htmlspecialchars($product['id'] ?? '');
        $output .= '<div class="custom-bokun-category-card">';
        if (count($images) === 2) {
            $output .= '<div class="custom-bokun-image-grid">';
            foreach ($images as $image) {
                $imageUrl = htmlspecialchars($image['derived'][1]['url'] ?? ''); // Preview URL (index 1)
                $output .= '
                <div class="custom-bokun-products-large-image">
                    <img src="' . $imageUrl . '" alt="Large Image">
                </div>';
            }
            $output .= '</div>';
        } elseif (count($images) >= 3) {
            $mainImageUrl = htmlspecialchars($images[0]['derived'][1]['url'] ?? '');
            $output .= '<div class="custom-bokun-image-grid">';
            $output .= '
                <div class="custom-bokun-products-large-image">
                    <img src="' . $mainImageUrl . '" alt="Large Image">
                </div>
                <div class="custom-bokun-product-small-images">';
            for ($i = 1; $i < 3; $i++) {
                if (!empty($images[$i])) {
                    $smallImageUrl = htmlspecialchars($images[$i]['derived'][1]['url'] ?? '');
                    $output .= '<img src="' . $smallImageUrl . '" alt="Small Image ' . $i . '">';
                }
            }
            $output .= '</div></div>';
        }

        $output .= '
            <div class="custom-bokun-card-overlay">
                <h2>' . $title . '</h2>
                <p>' . $experiences . '</p>
                <button data-product-id="' . $product_id . '" class="custom-bokun-view-list">View list</button>
            </div>
        </div>';
    }
    $output .= '</div>';

    return $output;
}

function displayBokunProducts()
{
    $method = 'GET';
    $path = '/product-list.json/list?lang=EN';
    // Create a unique cache key for these products
    $cache_key = 'bokun_api_products_' . md5($path);
    // Try to get cached data
    $products = get_transient($cache_key);
    // If no cached data found, fetch from API and set transient
    if (false === $products) {
        $products = authenticateBokunApi($method, $path);
        if ($products) {
            // Cache the response for one hour
            set_transient($cache_key, $products, DAY_IN_SECONDS);
        } else {
            error_log('Failed to fetch products from Bokun API.');
            return '<p>Failed to fetch Products. Please try again later.</p>';
        }
    }
    // Render products if available
    if ($products) {
        return renderBokunProducts($products);
    }
    // If something went wrong
    error_log('Failed to fetch or find products.');
    return '<p>No products found. Check API or debug logs for details.</p>';
}
add_shortcode('bokun_products', 'displayBokunProducts');
