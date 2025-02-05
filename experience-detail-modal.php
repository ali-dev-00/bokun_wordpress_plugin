<?php
add_action('wp_ajax_fetch_experience_details', 'fetch_experience_details');
add_action('wp_ajax_nopriv_fetch_experience_details', 'fetch_experience_details');
function fetch_experience_details()
{
    if (!isset($_POST['experience_id'])) {
        wp_send_json_error('Experience ID is required.');
    }
    $default_currency = isset($_POST['currency']) && !empty($_POST['currency']) ? sanitize_text_field($_POST['currency']) : BOKUN_CURRENCY;
    $default_lang     = isset($_POST['language']) && !empty($_POST['language']) ? sanitize_text_field($_POST['language']) : BOKUN_LANGUAGE;
    $experience_id = sanitize_text_field($_POST['experience_id']);
    $path = '/activity.json/' . $experience_id . '?currency=' . $default_currency . '&lang=' . $default_lang;
    $method = 'GET';
    $cache_key = 'bokun_experience_details_' . md5($experience_id . $path);
    $response = get_transient($cache_key);
    if (false === $response) {
        $response = authenticateBokunApi($method, $path);
        if ($response) {
            set_transient($cache_key, $response, DAY_IN_SECONDS);
        }
    }

    if ($response && !empty($_POST['json_only'])) {
        wp_send_json_success($response);
    }

    if ($response) {
        $photos = $response['photos'] ?? [];
        ob_start();
?><div class="custom-bokun-modal-content">
            <div class="custom-bokun-modal-header">
                <div></div>
                <div class="custom-bokun-header-controls">
                    <div class="custom-bokun-dropdown-container" style="display: none !important;">
                        <?php cbkn_render_language_dropdown($default_lang); ?>
                    </div>
                    <div class="custom-bokun-dropdown-container">
                        <select class="custom-bokun-dropdown currency-dropdown">
                            <option value="AED">AED</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                    <button class="custom-bokun-header-btn cart-btn">
                        <img src="<?php echo plugin_dir_url(__FILE__); ?>/bokun_images/cart.svg" alt="CART" width="26px" height="16">
                        <span class="cart-badge" id="cartBadge">0</span>
                    </button>
                    <button class="custom-bokun-close-btn header-btn">&times;</button>
                </div>
            </div>
            <div class="custom-bokun-cart-modal" id="customBokunCartModal">
            </div>
            <div class="custom-bokun-image-grid-container" style="display: <?php echo (isset($response['photos']) && count($response['photos']) > 1) ? 'flex' : 'unset'; ?> !important;">
                <button class="custom-view-photos-btn" id="custom_bokun_gallery_btn">View Photos</button>
                <div class="custom-bokun-large-image">
                    <?php
                    $keyPhoto = isset($response['keyPhoto']['derived'][2]['url'])
                        ? htmlspecialchars($response['keyPhoto']['derived'][2]['url'])
                        : '';
                    if (!empty($keyPhoto)) {
                        echo '<img src="' . $keyPhoto . '" alt="Large Image">';
                    } else {
                        echo '<p>No large image available</p>';
                    }
                    ?>
                </div>

                <?php
                $photos = isset($response['photos']) && is_array($response['photos']) ? $response['photos'] : [];
                $photoCount = count($photos);
                ?>

                <div class=" <?= ($photoCount === 2) ? 'custom-bokun-large-image' : 'custom-bokun-small-images'; ?>">
                    <?php
                    if ($photoCount > 0) {
                        for ($i = 1; $i < 5; $i++) {
                            $smallImage = $photos[$i]['originalUrl'] ?? null;
                            if ($smallImage) {
                                if ($photoCount > 2) {
                                    echo '<div class="custom-bokun-small-image">';
                                }

                                echo '<img src="' . htmlspecialchars($smallImage) . '" alt="Small Image ' . ($i + 1) . '">';

                                if ($photoCount > 2) {
                                    echo '</div>';
                                }
                            }
                        }
                    } else {
                        echo '<p>No photos available.</p>';
                    }
                    ?>
                </div>

            </div>
            <!-- Left Section -->
            <div class="custom-bokun-modal-body">
                <div class="custom-bokun-modal-left-section">
                    <div>
                        <h3 class="custom-booking-title">
                            <?php
                            if (!empty($response['title'])):
                                echo $response['title'] ?? 'No Title';
                            endif;
                            ?>
                        </h3>
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <?php if (!empty($response['durationText'] ?? '')): ?>
                                    <img src="<?php echo plugin_dir_url(__FILE__); ?>/bokun_images/clock.svg" alt="" width="16" height="16">
                                    <?php echo ucfirst(strtolower($response['durationText'] ?? 'No excerpt')); ?>
                                <?php endif; ?>
                                <?php if (!empty($response['difficultyLevel'] ?? '')): ?>
                                    <?php
                                    // Set color and fill based on difficulty level
                                    $difficultyLevel = strtolower($response['difficultyLevel']);
                                    switch ($difficultyLevel) {
                                        case 'moderate':
                                            $color = '#FFFFAB';
                                            $fill = '50%';
                                            break;
                                        case 'easy':
                                            $color = '#BEEECF';
                                            $fill = '80%';
                                            break;
                                        case 'challenging':
                                            $color = '#FFFFAB';
                                            $fill = '15%';
                                            break;
                                        default:
                                            $color = 'gray';
                                            $fill = '0%';
                                    }
                                    ?>
                                    <!-- Custom Circle with dynamic color and fill -->
                                    <div class="custom-bokun-difficulty-circle"
                                        style="background-color: <?php echo htmlspecialchars($color); ?>;">
                                        <div style="background-color: white; width: 100%; height: <?php echo htmlspecialchars($fill); ?>;
                        position: absolute; bottom: 0;"></div>
                                    </div>
                                    <?php echo ucfirst(strtolower($response['difficultyLevel'] ?? 'No difficulty level')); ?>
                                <?php endif; ?>
                            </div>
                            <?php
                            $rating = $response['tripadvisorReview']['rating'] ?? 0; // Default to 0 if not set
                            $numReviews = $response['tripadvisorReview']['numReviews'] ?? 0; // Default to 0 if not set
                            if ($rating > 0) : ?>
                                <div class="custom-bokun-rating-container">
                                    <img src="<?php echo plugin_dir_url(__FILE__); ?>/bokun_images/reviews.svg" alt="">
                                    <div class="custom-bokun-rating-circles" data-rating="<?php echo $rating; ?>" data-total-circles="5"></div>
                                    <div class="custom-bokun-review-count">
                                        <p class="custom-bokun-review-link">
                                            <span class="custom-bokun-review-count-value" data-reviews="<?php echo $numReviews; ?>"><?php echo $numReviews; ?></span> reviews
                                        </p>
                                    </div>
                                </div>
                            <?php endif; ?>
                            <p>
                                <?php if (!empty($response['excerpt'])):
                                    echo $response['excerpt'] ?? 'No excerpt';
                                endif;
                                ?>
                            </p>
                        </div>
                    </div>
                    <div class="custom-bokun-tabs">
                        <button class="custom-bokun-tab-btn active" data-tab="description">Description</button>
                        <?php if (!empty($response['agendaItems']) && is_array($response['agendaItems'])): ?>
                            <button class="custom-bokun-tab-btn" data-tab="itinerary">Itinerary</button>
                        <?php endif; ?>
                        <?php if (!empty($response['startPoints']) && is_array($response['startPoints'])): ?>
                            <button class="custom-bokun-tab-btn" data-tab="meeting-points">Meeting Points</button>
                        <?php endif; ?>
                        <button class="custom-bokun-tab-btn" data-tab="pick-up" data-experience-id="<?php $id =  $response['id'] ?? "930914";
                                                                                                    echo $id; ?>">Pick-up</button>
                    </div>
                    <div class="custom-bokun-tab-content" id="description">
                        <p><?= $response['description'] ?? 'No description available.' ?></p>
                        <?php if (!empty($response['videos']) && is_array($response['videos'])): ?>
                            <div class="custom-bokun-itinerary-images">
                                <?php foreach ($response['videos'] as $video): ?>
                                    <?php if (!empty($video['html'])): ?>
                                        <?php echo $video['html']; ?>
                                    <?php elseif (!empty($video['sourceUrl'])): ?>
                                        <iframe
                                            width="356"
                                            height="200"
                                            src="<?php echo htmlspecialchars(str_replace('watch?v=', 'embed/', $video['sourceUrl'])); ?>?feature=oembed"
                                            frameborder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            referrerpolicy="strict-origin-when-cross-origin"
                                            allowfullscreen
                                            title="Video">
                                        </iframe>
                                    <?php endif; ?>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                        <div class="custom-bokun-additional-info">
                            <div style="display: flex;">
                                <?php if (!empty($response['included'])): ?>
                                    <div class="custom-bokun-info-group">
                                        <h3>What's included?</h3>
                                        <div class="sc-eACIdI hHknew"></div>

                                        <div>
                                            <?php
                                            $includedItems = explode('<br />', $response['included']);
                                            foreach ($includedItems as $item):
                                            ?>
                                                <?php echo $item; ?>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                <?php endif; ?>
                                <?php if (!empty($response['excluded'])): ?>
                                    <div class="custom-bokun-info-group">
                                        <h3>Exclusions</h3>
                                        <div class="sc-eACIdI hHknew"></div>
                                        <div>
                                            <?php
                                            $excludedItems = explode('<br />', $response['excluded']);
                                            foreach ($excludedItems as $item):
                                            ?>
                                                <?php echo  $item; ?>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                <?php endif; ?>
                            </div>
                            <?php if (!empty($response['attention']) || !empty($response['knowBeforeYouGoItems'])): ?>
                                <div class="custom-bokun-info-group" style="width:90% !important;">
                                    <h3>Please note</h3>
                                    <div class="sc-eACIdI hHknew"></div>

                                    <?php if (!empty($response['knowBeforeYouGoItems'])): ?>
                                        <ul>
                                            <?php
                                            foreach ($response['knowBeforeYouGoItems'] as $item):
                                                $formattedItem = ucwords(strtolower(str_replace('_', ' ', $item)));
                                                $formattedItem = str_replace(
                                                    ['Stroller Or Pram Accessible', 'Wheelchair Accessible', 'Animals Or Pets Allowed', 'Infants Must Sit On Laps'],
                                                    ['Stroller / pram accessible', 'Wheelchair accessible', 'Animals or pets allowed', 'Infants must sit on your lap'],
                                                    $formattedItem
                                                );
                                            ?>
                                                <li><?php echo htmlspecialchars($formattedItem); ?></li>
                                            <?php endforeach; ?>
                                        </ul>
                                    <?php endif; ?>
                                    <?php if (!empty($response['attention'])): ?>
                                        <p><?php echo $response['attention']; ?></p>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($response['requirements'])): ?>
                                <div class="custom-bokun-info-group" style="width:90% !important;">
                                    <h3>What do i need to bring?</h3>
                                    <div class="sc-eACIdI hHknew"></div>
                                    <?php
                                    echo $response['requirements'];
                                    ?>
                                </div>
                            <?php endif; ?>
                            <?php if (!empty($response['cancellationPolicy'])): ?>
                                <div class="custom-bokun-info-group" style="width:90% !important;">
                                    <h3>Cancellation policy</h3>
                                    <div class="sc-eACIdI hHknew"></div>

                                    <?php
                                    $cancellationPolicy = $response['cancellationPolicy'];
                                    $penaltyRules = $cancellationPolicy['penaltyRules'] ?? [];

                                    if (!empty($penaltyRules)) : ?>
                                        <ul>
                                            <?php foreach ($penaltyRules as $rule):
                                                $cutoffDays = floor($rule['cutoffHours'] / 24);
                                                $cancellationFee = $rule['charge'] ?? 0;
                                                $feeText = ($rule['chargeType'] === 'percentage') ? "{$cancellationFee}%" : "{$cancellationFee}";
                                            ?>
                                                <li>
                                                    <?php
                                                    if ($cancellationFee > 0) {
                                                        echo "We will charge a cancellation fee of {$feeText} if booking is cancelled {$cutoffDays} days or less before the event.";
                                                    } else {
                                                        echo "We will charge a fee of {$feeText} if booking is cancelled {$cutoffDays} days or less before the event.";
                                                    }
                                                    ?>
                                                </li>
                                            <?php endforeach; ?>
                                        </ul>
                                    <?php elseif ($cancellationPolicy['policyTypeEnum'] === 'NON_REFUNDABLE') : ?>
                                        <ul>
                                            <li>
                                                <?php
                                                $title = $cancellationPolicy['title'];
                                                echo "Bookings are {$title}. All sales are final.";
                                                ?>
                                            </li>
                                        </ul>
                                    <?php endif; ?>

                                </div>
                            <?php endif; ?>

                            <?php if (!empty($response['activityType'] || $response['bookingCutoffHours'] || $response['durationText'] || $response['bookingCutoffHours'] || $response['activityType'] || $response['minAge'] || $response['activityCategories'] || $response['activityAttributes'])): ?>
                                <div class="custom-bokun-more-info">
                                    <h2>More Info</h2>
                                    <div class="sc-eACIdI hHknew"></div> <!-- Blue underline -->
                                    <div class="custom-bokun-info-grid">
                                        <?php if (!empty($response['activityType'])): ?>
                                            <div class="custom-bokun-info-column">
                                                <h4>Experience type</h4>
                                                <p style="text-transform: capitalize;">
                                                    <?php
                                                    if (!empty($response['activityType'])) {
                                                        echo htmlspecialchars(ucwords(str_replace('_', ' ', strtolower($response['activityType']))));
                                                    }
                                                    ?>
                                                </p>
                                            </div>
                                        <?php endif; ?>
                                        <?php if (!empty($response['bookingCutoffHours']) && $response['bookingCutoffHours'] !== '0'): ?>
                                            <div class="custom-bokun-info-column">
                                                <h4>Booking in advance</h4>
                                                <p> Cut off hours: <?php echo $response['bookingCutoffHours']; ?> hours</p>
                                            </div>
                                        <?php elseif (!empty($response['bookingCutoffDays']) && $response['bookingCutoffDays'] !== '0'): ?>
                                            <div class="custom-bokun-info-column">
                                                <h4>Booking in advance</h4>
                                                <p> Cut off days: <?php echo $response['bookingCutoffDays']; ?> day</p>
                                            </div>
                                        <?php endif; ?>

                                        <?php if (!empty($response['durationText'])): ?>
                                            <div class="custom-bokun-info-column">
                                                <h4>Duration</h4>
                                                <p><?php echo $response['durationText'] ?></p>
                                            </div>
                                        <?php endif; ?>
                                        <?php if (!empty($response['difficultyLevel'])): ?>
                                            <div class="custom-bokun-info-column">
                                                <h4>Difficulty</h4>
                                                <p><?php echo $response['difficultyLevel'] ?></p>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    <?php if (!empty($response['activityCategories']) || !empty($response['activityAttributes'])): ?>
                                        <div class="custom-bokun-categories-section">
                                            <h4>Categories</h4>
                                            <div class="custom-bokun-categories-tags">
                                                <?php if (!empty($response['activityCategories']) && is_array($response['activityCategories'])): ?>
                                                    <?php foreach ($response['activityCategories'] as $category): ?>
                                                        <span class="custom-bokun-tag">
                                                            <?php echo htmlspecialchars(ucwords(str_replace('_', ' ', strtolower($category)))); ?>
                                                        </span>
                                                    <?php endforeach; ?>
                                                <?php endif; ?>
                                                <?php if (!empty($response['activityAttributes']) && is_array($response['activityAttributes'])): ?>
                                                    <?php foreach ($response['activityAttributes'] as $attribute): ?>
                                                        <span class="custom-bokun-tag">
                                                            <?php echo htmlspecialchars(ucwords(str_replace('_', ' ', strtolower($attribute)))); ?>
                                                        </span>
                                                    <?php endforeach; ?>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php if (!empty($response['agendaItems']) && is_array($response['agendaItems'])): ?>
                        <div class="custom-bokun-tab-content" id="itinerary" style="display: none;">
                            <?php
                            $counter = 0;
                            $buffer = [];
                            ?>
                            <?php foreach ($response['agendaItems'] as $item): ?>
                                <?php
                                $counter++;
                                $buffer[] = $item;
                                ?>
                                <?php if (!empty($item['title'])): ?>
                                    <h6><?php echo htmlspecialchars($item['title']); ?></h6>
                                <?php endif; ?>
                                <?php if (!empty($item['body'])): ?>
                                    <p><?php echo $item['body']; ?></p>
                                <?php endif; ?>
                                <!-- Check if we printed 2 items -->
                                <?php if ($counter % 2 === 0): ?>
                                    <div class="custom-bokun-itinerary-images">
                                        <?php foreach ($buffer as $bufferedItem): ?>
                                            <?php if (!empty($bufferedItem['keyPhoto']['derived'][1]['url'])): ?>
                                                <img src="<?php echo htmlspecialchars($bufferedItem['keyPhoto']['derived'][1]['url']); ?>"
                                                    alt="Itinerary Image"
                                                    style="max-width: 600px; height: auto; margin-right: 10px;">
                                            <?php endif; ?>
                                        <?php endforeach; ?>
                                    </div>
                                    <?php $buffer = [];
                                    ?>
                                    <?php if (!empty($item['location']['latitude']) && !empty($item['location']['longitude'])): ?>
                                        <a href="#" class="custom-bokun-show-location">
                                            Show Location
                                            <div class="map"
                                                style="height: 350px; width: 90%; margin: 10px 0px;"
                                                data-latitude="<?php echo htmlspecialchars($item['location']['latitude']); ?>"
                                                data-longitude="<?php echo htmlspecialchars($item['location']['longitude']); ?>"
                                                data-zoom="<?php echo htmlspecialchars($item['location']['zoomLevel']); ?>"
                                                data-title="<?php echo htmlspecialchars($item['location']['wholeAddress'] ?: 'Location'); ?>">
                                            </div>
                                        </a>
                                    <?php endif; ?>
                                <?php endif; ?>
                            <?php endforeach; ?>
                            <?php if (!empty($buffer)): ?>
                                <div class="custom-bokun-itinerary-images">
                                    <?php foreach ($buffer as $bufferedItem): ?>
                                        <?php if (!empty($bufferedItem['keyPhoto']['derived'][1]['url'])): ?>
                                            <img src="<?php echo htmlspecialchars($bufferedItem['keyPhoto']['derived'][1]['url']); ?>"
                                                alt="Itinerary Image"
                                                style="max-width: 200px; height: auto; margin-right: 10px;">
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                    <div class="custom-bokun-tab-content" id="meeting-points" style="display: none;">
                        <p>If you do not choose pick-up, you can start the experience at any of the places below:</p>
                        <?php foreach ($response['startPoints'] as $startPoint): ?>
                            <strong><?php echo htmlspecialchars($startPoint['title']); ?></strong><br>
                            <?php echo htmlspecialchars($startPoint['address']['addressLine1']); ?>,
                            <?php echo htmlspecialchars($startPoint['address']['city']); ?>,
                            <?php echo htmlspecialchars($startPoint['address']['state']); ?>,
                            <?php echo htmlspecialchars($startPoint['address']['postalCode']); ?>,
                            <?php echo htmlspecialchars($startPoint['address']['countryCode']); ?>
                            <!-- Map Display -->
                            <?php if (!empty($startPoint['address']['geoPoint']['latitude']) && !empty($startPoint['address']['geoPoint']['longitude'])): ?>
                                <a href="#" class="custom-bokun-show-location">
                                    Show Location
                                    <div class="map"
                                        style="height: 350px; width: 90%; margin: 10px 0px;"
                                        data-latitude="<?php echo htmlspecialchars($startPoint['address']['geoPoint']['latitude']); ?>"
                                        data-longitude="<?php echo htmlspecialchars($startPoint['address']['geoPoint']['longitude']); ?>"
                                        data-zoom="<?php echo htmlspecialchars($startPoint['address']['mapZoomLevel']); ?>"
                                        data-title="<?php echo htmlspecialchars($startPoint['title']); ?>">
                                    </div>
                                </a>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </div>
                    <div class="custom-bokun-tab-content" id="pick-up" style="display: none;">
                        <p>Note: Pick-up starts 30 minute(s) before departure.</p>
                        <p>We offer pick-up to the following places for this experience:</p>
                        <ul id="pickup-list">
                        </ul>
                    </div>
                </div>
                <!-- Right Section -->
                <div class="custom-bokun-modal-right-section">
                    <h3 class="custom-bokun-">Participants</h3>
                    <div class="sc-eACIdI hHknew" style="margin-bottom:20px;"></div>
                    <?php
                    foreach ($response['pricingCategories'] as $key => $pricingCategory) {

                        $groupSize = (int)$pricingCategory['groupSize'];
                        $groupSizeDropDown = '';

                        if ($groupSize > 0) {
                            $groupSizeDropDown = '<div class="group-size-dropdown-container"><label>Group Size</label><select class="group-size-dropdown" data-pricing-category-id="' . htmlspecialchars($pricingCategory['id'], ENT_QUOTES, 'UTF-8') . '">';
                            for ($i = 1; $i <= $groupSize; $i++) {
                                $groupSizeDropDown .= "<option value=\"$i\">$i</option>";
                            }
                            $groupSizeDropDown .= '</select></div>';
                        }


                        echo '<div class="custom-bokun-selected-participants" data-json="' . htmlspecialchars(json_encode($pricingCategory), ENT_QUOTES, 'UTF-8') . '" data-pricing-category-id="' . htmlspecialchars($pricingCategory['id'], ENT_QUOTES, 'UTF-8') . '">
                                    <div>
                                        ' . $pricingCategory['title'] . '
                                        <br>';
                        if ($pricingCategory['minAge'] && $pricingCategory['maxAge']) {
                            echo '<small>Age ' . $pricingCategory['minAge'] . '-' . $pricingCategory['maxAge'] . '</small>';
                        }
                        echo '</div>
                                    <div class="custom-bokun-participant-controls">
                                        <button class="dec-pcount" id="decrease">-</button>
                                        <span id="participant-count" class="participant-count">' . ($key == 0 ? 1 : 0) . '</span>
                                        <button class="inc-pcount" id="increase">+</button>
                                    </div>
                                </div>';

                        echo $groupSizeDropDown;
                    }
                    ?>
                    <div class="custom-bokun-date-picker">
                        <div class="border choose-a-date-div" style="margin-bottom: 20px;">
                            <h3>Choose a date</h3>
                            <div class="sc-eACIdI hHknew"></div>
                        </div>
                        <div class="custom-bokun-calendar-wrapper">
                            <input type="hidden" name="selected_package_price" id="selected_package_price" />
                            <input type="hidden" name="selectedDate" id="selectedDate" />
                            <input type="hidden" name="selectedTimeSlot" id="selectedTimeSlot" />
                            <input type="hidden" name="total_price" class="total_price" />
                            <!-- Calendar View -->
                            <div id="calendar-view">
                                <!-- Calendar Header -->
                                <div class="custom-bokun-calendar-header">
                                    <button class="custom-bokun-nav-button" id="prev-month">&#x25C0;</button>
                                    <div class="custom-bokun-month-dropdown">
                                        <span id="current-month"></span>
                                        <span class="custom-bokun-dropdown-icon">&#x25BC;</span>
                                    </div>
                                    <button class="custom-bokun-nav-button" id="next-month">&#x25B6;</button>
                                </div>
                                <!-- Calendar Content -->
                                <div id="calendar-table" class="custom-bokun-calendar-cells">
                                    <div id="table-header">
                                        <div class="custom-bokun-row">
                                            <div class="custom-bokun-col">Mon</div>
                                            <div class="custom-bokun-col">Tue</div>
                                            <div class="custom-bokun-col">Wed</div>
                                            <div class="custom-bokun-col">Thu</div>
                                            <div class="custom-bokun-col">Fri</div>
                                            <div class="custom-bokun-col">Sat</div>
                                            <div class="custom-bokun-col">Sun</div>
                                        </div>
                                    </div>
                                    <div id="table-body"></div>
                                </div>
                                <div id="time-package-view" style="display: none;">
                                    <div style="display: flex; align-items: center; gap:10px;">
                                        <button id="back-to-calendar" class="back-to-calendar"
                                            style="cursor: pointer; background: none; font-size: 1.5rem; border: 1px solid; border-radius: 5px;padding:2px;color:gray">
                                            < </button>
                                                <h3 style="margin:0;" id="selected-date"></h3>
                                    </div>
                                    <div class="sc-eACIdI hHknew" style="margin-bottom:20px;"></div>
                                    <h4> <i class="far fa-clock fa-xs" style="color: #1D57C7;"></i> Choose a time</h4>
                                    <div id="time-options" style="display: flex; gap: 10px; flex-wrap: wrap;">
                                        <?php
                                        // foreach ($response['startTimes'] as $startTime) {
                                        //     $formattedTime = sprintf('%02d:%02d', $startTime['hour'], $startTime['minute']);
                                        //     echo '<button class="custom-bokun-time-slot" data-time="' . $formattedTime . '">' . $formattedTime . '</button>';
                                        // }
                                        ?>
                                    </div>
                                    <button class="back-to-calendar"
                                        style="cursor: pointer; background: none; padding:2px;color:#1d57c7; font-weight:lighter; font-size: 12px;">
                                        < Back to Calendar
                                            </button>
                                            <div class="package-options-wrapper">
                                                <h4 class="package-options-default-content">Choose a package</h4>
                                                <div id="package-options-error" class="package-options-error" style="display: none;">
                                                    <h5>...text...</h5>
                                                </div>
                                                <div class="package-options-default-content" id="package-options"></div>
                                            </div>
                                </div>
                            </div>
                        </div>
                        <h3 class="custom-bokun-" style="margin-top: 10px;">Booking Summary</h3>
                        <div class="sc-eACIdI hHknew"></div>
                        <div class="custom-bokun-ticket-wrapper">
                            <div class="custom-bokun-outer">
                                <div class="custom-bokun-ticket">
                                </div>
                            </div>
                        </div>
                        <div id="custom-checkout-error">
                            <span class="error-message-cart"></span>
                        </div>
                        <!-- Checkout Button -->
                        <div class="custom-bokun-border" style="margin-top: 50px;">
                            <h3 class="custom-bokun-booking-summary"></h3>
                            <div class="custom-bokun-summary-content"></div>
                        </div>
                        <?php if (!empty($response['capacityType']) && $response['capacityType'] === "ON_REQUEST"): ?>
                            <div class="custom-alert">
                                <strong>⚠ Please read before continuing!</strong>
                                <p>This experience is booked on request. The owner of the experience will respond to the request within
                                    <strong><?php echo $response['requestDeadlineHours']; ?> hour(s)</strong>.
                                </p>
                            </div>
                        <?php endif; ?>

                        <div class="custom-bokun-checkout-wrapper" style="text-align: center; margin-top: 20px;">
                            <button class="checkoutAction" id="checkout-button" data-activity-id="<?php echo $response['id']; ?>">
                                <div class="custom-checkoutbtn-loader"></div>
                                <i class="fas fa-lock"></i> <span style="padding-left: 20px;">Checkout</span>
                            </button>
                        </div>
                        <div class="custom-bokun-footer-powered">
                            <span>Powered by</span>
                            <img src="<?php echo plugin_dir_url(__FILE__); ?>/bokun_images/bokun-img.svg" alt="" width="36" height="36">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="img-gallery-container" style="display: none;">
            <button class="custom-gallery-back-btn" id="custom-gallery-back-btn">← Back</button>
            <div id="slideshow" class="fullscreen">
                <?php if (isset($response['photos']) && is_array($response['photos'])): ?>
                    <?php $photos = $response['photos']; ?>
                    <?php foreach ($photos as $index => $photo): ?>
                        <?php
                        $largeImage = $photo['derived'][2]['url'] ?? null; // Large image URL
                        $thumbnail = $photo['derived'][0]['url'] ?? null; // Thumbnail image URL
                        if (!$largeImage || !$thumbnail) continue; // Skip if either image is missing
                        ?>
                        <div id="img-<?php echo $index + 1; ?>"
                            data-img-id="<?php echo $index + 1; ?>"
                            class="img-wrapper <?php echo $index === 0 ? 'active' : ''; ?>"
                            style="background-image: url('<?php echo htmlspecialchars($largeImage); ?>')">
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <p>No photos available.</p>
                <?php endif; ?>
                <!-- Render the thumbnails -->
                <div class="thumbs-container bottom">
                    <div id="prev-btn" class="custom-gallery-prev">
                        <i class="fa fa-chevron-left fa-3x"></i>
                    </div>
                    <ul class="thumbs">
                        <?php if (isset($response['photos']) && is_array($response['photos'])): ?>
                            <?php foreach ($photos as $index => $photo): ?>
                                <?php
                                $thumbnail = $photo['derived'][0]['url'] ?? null; // Thumbnail image URL
                                if (!$thumbnail) continue; // Skip if thumbnail is missing
                                ?>
                                <li data-thumb-id="<?php echo $index + 1; ?>"
                                    class="thumb <?php echo $index === 0 ? 'active' : ''; ?>"
                                    style="background-image: url('<?php echo htmlspecialchars($thumbnail); ?>')">
                                </li>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </ul>
                    <div id="next-btn" class="custom-gallery-next">
                        <i class="fa fa-chevron-right fa-3x"></i>
                    </div>
                </div>
            </div>
        </div>
        <?php
        // CHECKOUT MODAL CONTENT START 
        ?>
        <div class="custom-checkout-modal-overlay" id="checkout-modal" style="display: none;">
            <div class="custom-checkout-modal-content">
                <div class="custom-checkout-header-controls">
                    <a href="#" class="custom-checkout-back-button">
                        <span class="custom-checkout-back-arrow"></span> Back
                    </a>
                    <div class="custom-checkout-dropdown-container">
                        <select class="custom-checkout-currency-dropdown">
                            <option value="AED">AED</option>
                            <option value="USD">USD</option>
                        </select>
                        <button class="custom-checkout-close-btn close-btn-modal header-btn closeModal">&times;</button>
                    </div>
                </div>
                <div class="custom-checkout-header" id="checkoutHeader">
                    <img src="<?php echo plugin_dir_url(__FILE__); ?>/bokun_images/atlas.jpeg" alt="CART" width="50px" height="16" class="custom-checkout-logo">
                    <div class="custom-checkout-progress-bar" id="progressBar">
                    </div>
                    <div class="custom-checkout-circle-bar" id="circlebar">
                        <div class="custom-checkout-progress-circle">
                            <div class="circular-progress-fill" id="progressFill"></div>
                            <div class="progress-circle-content">
                                <span id="progressStepText">1 </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="custom-checkout-main-container">
                    <div class="custom-checkout-left-section" id="leftSection">
                    </div>
                    <div class="custom-checkout-right-section">
                    </div>
                </div>
                <div class="custom-checkout-custom-footer">
                    <div class="custom-checkout-footer-links">
                        <a href="#" class="custom-checkout-footer-link" data-target="termsContent">Terms And Conditions</a>
                        <a href="#" class="custom-checkout-footer-link" data-target="privacyContent">Privacy Policy</a>
                        <a href="#" class="custom-checkout-footer-link" data-target="cancellationContent">Cancellation Policy</a>
                    </div>
                    <div class="custom-checkout-footer-powered">
                        <span style="
                            align-items: end;
                            display: flex;
                            margin-right: 10px !important;">Powered by</span>
                        <img src="<?php echo plugin_dir_url(__FILE__) . 'bokun_images/bokun-img.svg'; ?>" alt="Bokun Logo">
                    </div>
                </div>
                <div id="contentContainer" class="custom-footer-content" style="display: none;">
                    <div id="termsContent" class="content-section" style="display: none;">
                        <h2>Terms and Conditions</h2>
                        <h3> Last Updated: (25-12-2024)</h3>
                        <p>
                            Thank you for choosing Atlas Al Arab Inbound Tourism LLC for your travel package(s). By booking
                            a trip through our website, you agree to the following terms and conditions. Please review them
                            carefully to ensure you fully understand the conditions of your booking.
                        </p>
                        <hr />
                        <h4>1. Pricing</h4>
                        <ul>
                            <li>Prices quoted on our website are per person unless otherwise mentioned.</li>
                            <li>Published rates do not include:
                                <ul>
                                    <li>Tips to guides or drivers</li>
                                    <li>Passport/visa fees</li>
                                    <li>Travel insurance</li>
                                    <li>Food, drinks, accommodation, room services, and laundry</li>
                                </ul>
                            </li>
                            <li>Rates are subject to change without prior notice due to factors such as increases in airline
                                tickets, hotel rates, or transportation costs.</li>
                        </ul>
                        <hr />
                        <h4>2. Methods of Payment</h4>
                        <ul>
                            <li>We accept Visa, MasterCard, American Express, Discover, and Diners credit cards.</li>
                            <li>Payments must be made in full at the time of booking.</li>
                            <li>Transactions will appear on your statement under “Atlas Al Arab Inbound Tourism LLC.”</li>
                        </ul>
                        <hr />
                        <h4>3. Confirmation of Payment</h4>
                        <ul>
                            <li>Upon successful payment, you will receive a confirmation slip via email.</li>
                            <li>Please ensure the information provided during booking is accurate. This confirmation slip
                                must be presented to redeem your travel package.</li>
                        </ul>
                        <hr>
                        <h4>4. Itinerary Amendments</h4>
                        <ul>
                            <li>Itineraries and services are subject to change due to local conditions, weather, or
                                unforeseen circumstances.</li>
                            <li>If changes are necessary, we will provide alternatives of similar value, subject to
                                availability.</li>
                            <li>Atlas Al Arab Inbound Tourism LLC reserves the right to make minor itinerary adjustments
                                without reimbursement.</li>
                            <li>No refunds will be provided in cases of force majeure, including but not limited to floods,
                                earthquakes, or other natural disasters.</li>
                        </ul>
                        <hr>
                        <h4>5. Travel Insurance</h4>
                        <ul>
                            <li>We strongly recommend purchasing travel insurance to cover potential damages, accidents,
                                illness, injuries, or losses.</li>
                            <li>
                                Atlas Al Arab Inbound Tourism LLC is not liable for damages resulting from any of the above.
                            </li>
                        </ul>
                        <hr>
                        <h4>6. Travel Documents</h4>
                        <ul>
                            <li>Guests are responsible for ensuring they carry all relevant travel documents, including
                                valid passports or ID cards.</li>
                            <li>
                                No refunds will be provided if a booking is canceled due to the loss or lack of required
                                documents.
                            </li>
                            <li>Passengers must check entry, visa, and health requirements with their respective consulates
                                prior to travel. Requirements are subject to change without prior notice.</li>
                        </ul>
                        <hr>
                        <h4>7. Website Usage Restrictions</h4>
                        <ul>
                            <li>All content on this website, including logos, images, pricing details, and package
                                information, is proprietary to Atlas Al Arab Inbound Tourism LLC.
                            </li>
                            <li>
                                Users agree not to exploit the website or its content for commercial or unauthorized
                                purposes.
                            </li>
                        </ul>
                        <hr>
                        <h4>8. Governing Law</h4>
                        <ul>
                            <li>“Atlas Al Arab Inbound Tourism LLC” maintains the website https://www.atlas-alarab.com.
                            </li>
                            <li>
                                The governing law is the local law of the United Arab Emirates, as UAE is our country of
                                domicile.
                            </li>
                            <li>Any disputes, claims, or purchases made through this website will be governed by UAE laws.
                            </li>
                        </ul>
                        <hr>
                        <h4>9. Payment Terms</h4>
                        <ul>
                            <li>“Visa or MasterCard debit and credit cards in AED” are accepted.
                            </li>
                            <li>
                                The price and currency displayed at checkout will match the amount on the transaction
                                receipt and the charge on your card statement.
                            </li>
                            <li>We will not trade with or provide services to OFAC and sanctioned countries.
                            </li>
                        </ul>
                        <hr>
                        <h4>10. Age Restrictions</h4>
                        <ul>
                            <li>Minors (individuals under the age of 18) are not allowed to register as users of this
                                website or make transactions.
                            </li>
                        </ul>
                        <hr>
                        <h4>11. Customer Responsibilities</h4>
                        <ul>
                            <li>Cardholders must retain copies of transaction records and review
                                https://www.atlas-alarab.com policies.
                            </li>
                            <li>Users are responsible for maintaining the confidentiality of their account information.
                            </li>
                        </ul>
                        <hr>
                        <h4>12. Refund and Cancellation Policy</h4>
                        <ul>
                            <li><strong>Cancellation Fees:</strong>
                                A cancellation fee of 100% is charged if canceled 1 day or less before the scheduled
                                booking.
                                No cancellation fee (0%) is charged if canceled 1000 days or more before the scheduled
                                booking.</li>
                            <li><strong>Refund Processing:</strong>
                                ‘’Refunds will be done only through the Original Mode of Payment and will be
                                processed within 10 to 45 days depends on the issuing bank of the credit card.”</li>
                        </ul>
                        <hr>
                        <h4>13. Security of Transactions</h4>
                        <ul>
                            <li>
                                “All credit/debit card details and personally identifiable information will NOT be stored,
                                sold, shared, rented, or leased to third parties.”</li>
                            <li>
                                Atlas Al Arab Inbound Tourism LLC ensures data privacy and security using hardware and
                                software methodologies, including SSL encryption and firewalls.
                            </li>
                            <li>However, we cannot guarantee complete security for information disclosed online.
                            </li>
                        </ul>
                        <hr>
                        <h4>14. Policy Updates</h4>
                        <ul>
                            <li>
                                These Terms & Conditions may be updated periodically to meet regulatory, legal, or business
                                requirements.
                            </li>
                            <li>
                                Updates will be posted on this page, and the “Last Updated” date will be revised. Customers
                                are encouraged to review this page frequently.
                            </li>
                            <li>However, we cannot guarantee complete security for information disclosed online.
                            </li>
                        </ul>
                        <hr>
                        <h4>15.General Information</h4>
                        <ul>
                            <li>
                                “ATLAS AL ARAB INBOUND TOURISM L.L.C” maintains the https://www.atlas-alarab.com Website
                                (“Site”).
                            </li>
                            <li>
                                “United Arab of Emirates is our country of domicile”, and the governing law is the local
                                law.
                            </li>
                            <li>“Any purchase, dispute, or claim arising out of or in connection with this website shall be
                                governed and construed in accordance with the laws of UAE.”
                            </li>
                            <li>“Visa or MasterCard debit and credit cards in AED” will be accepted for payment.
                            </li>
                            <li>The “displayed price and currency at the checkout page” will be the same price and currency
                                printed on the Transaction Receipt, and the amount charged to the card will be shown in your
                                card currency.
                            </li>
                            <li>“We will not trade with or provide any services to OFAC and sanctioned countries.”
                            </li>
                            <li>“Customers using the website who are minors (under the age of 18) shall not register as
                                users of the website and shall not transact on or use the website.”
                            </li>
                            <li>“Cardholders must retain a copy of transaction records and https://www.atlas-alarab.com
                                policies and rules.”
                            </li>
                            <li>“Users are responsible for maintaining the confidentiality of their accounts.”
                            </li>
                        </ul>
                        <hr>
                        <h4>16.Contact Us</h4>
                        <ul>
                            If you have any questions or concerns about these Terms & Conditions, please contact us at:
                            <li>
                                Email: Info@atlas-alarab.com
                            </li>
                            <li>
                                Phone: +971409047817
                            </li>
                            <li>Website: https://www.atlas-alarab.com
                            </li>
                        </ul>
                    </div>
                    <div id="privacyContent" class="content-section" style="display: none;">
                        <h2>Privacy Policy</h2>
                        <h3>Last Updated: (25-12-2024)</h3>
                        <p>
                            At Atlas Al Arab Inbound Tourism LLC, we respect our valued customers’ privacy and ensure not to
                            collect any information other than what is relevant to process bookings or transactions with us.
                            This Privacy Policy outlines our commitment to safeguarding your personal information and
                            maintaining transparency about its use.
                        </p>
                        <hr />
                        <h4>1. Collection of Personal Information</h4>
                        <ul>
                            <li>
                                We collect your information when you contact us to inquire about our products and services
                                or make a booking. This may include:
                                <ul>
                                    <li>
                                        <strong>Personal Information:</strong> Name, contact details, email address,
                                        physical address, credit card or payment details, travel requirements, and referral
                                        source.
                                    </li>
                                    <li>
                                        <strong>Non-Personal Information:</strong> Data from website usage patterns via web
                                        logs and third-party service providers, primarily for evaluating website content and
                                        performance.
                                    </li>
                                </ul>
                            </li>
                            <li>
                                Upon submission, you give consent for Atlas Al Arab Inbound Tourism LLC to use your
                                information to process orders accurately and efficiently.
                            </li>
                        </ul>
                        <hr />
                        <h4>2. Use of Information</h4>
                        <ul>
                            <li>Processing bookings and verifying payment details.</li>
                            <li>Providing relevant information about travel or any additional services requested.</li>
                            <li>Communicating updates or changes related to your booking.</li>
                            <li>Conducting audits, research, and website performance improvements.</li>
                        </ul>
                        <hr />
                        <h4>3. Sharing Your Information</h4>
                        <ul>
                            <li>
                                Your information will not be disclosed, sold, or rented to any unauthorized third party.
                                However, it may be shared in the following cases:
                                <ul>
                                    <li>
                                        <strong>Payment Processing:</strong> Payments are securely processed via Telr, our
                                        third-party payment gateway partner. By making a payment, you consent to sharing
                                        your payment and personal details with Telr for transaction processing. Telr’s
                                        Privacy Policy can be reviewed here.
                                    </li>
                                    <li>
                                        <strong>Service Providers:</strong> With suppliers or third parties necessary to
                                        complete your booking. We ensure these third parties comply with our privacy policy
                                        and maintain strict data security.
                                    </li>
                                    <li>
                                        <strong>Legal Requirements:</strong> If required by law, court order, or legal
                                        proceedings.
                                    </li>
                                </ul>
                            </li>
                        </ul>
                        <hr />
                        <h4>4. Data Retention</h4>
                        <ul>
                            <li>
                                We retain your personal data only for as long as necessary to fulfill the purposes outlined
                                in this Privacy Policy or comply with legal, tax, and regulatory obligations. Once this
                                period ends, your data will be securely deleted.
                            </li>
                        </ul>
                        <hr />
                        <h4>5. Privacy of Your Information</h4>
                        <ul>
                            <li>
                                All information provided during online booking—such as your name, address, email, and credit
                                card details—is considered private. We employ stringent measures, including encryption,
                                secure socket layers (SSL), and firewalls, to ensure your data’s security.
                            </li>
                        </ul>
                        <hr />
                        <h4>6. Refunds and Payment Issues</h4>
                        <ul>
                            <li>
                                In case of payment disputes or refunds, we will share your transaction details with Telr to
                                facilitate resolution. Refunds are subject to our Terms & Conditions, which you can review
                                here. If you have concerns about payments, please contact us at [insert email/contact].
                            </li>
                        </ul>
                        <hr />
                        <h4>7. Non-Personal Information</h4>
                        <ul>
                            <li>
                                We may collect non-personal data, such as website usage statistics, via cookies and
                                analytics tools, to improve our website and user experience. This data is primarily used for
                                internal analysis and remains anonymous.
                            </li>
                        </ul>
                        <hr />
                        <h4>8. Cookies</h4>
                        <ul>
                            <li>
                                Our website uses cookies to enhance user experience and analyze website traffic. By using
                                our website, you consent to our use of cookies. You can adjust your browser settings to
                                decline cookies; however, this may affect website functionality.
                            </li>
                        </ul>
                        <hr />
                        <h4>9. Opt-Out Options</h4>
                        <ul>
                            <li>
                                You can opt out of receiving promotional materials or newsletters by contacting us at
                                [insert contact information]. However, you will continue to receive necessary updates
                                related to your bookings.
                            </li>
                        </ul>
                        <hr />
                        <h4>10. Contests and Surveys</h4>
                        <ul>
                            <li>
                                We may conduct contests and surveys in collaboration with third-party sponsors.
                                Participation is voluntary, and you will be informed about how your personal data may be
                                used before participating.
                            </li>
                        </ul>
                        <hr />
                        <h4>11. Secured Transactions</h4>
                        <ul>
                            <li>
                                To ensure safe transactions, we use secured servers and technical safeguards, such as
                                encryption and firewalls.
                            </li>
                            <li>
                                “All credit/debit card details and personally identifiable information will NOT be stored,
                                sold, shared, rented, or leased to third parties.”
                            </li>
                            <li>
                                “Atlas Al Arab Inbound Tourism LLC takes appropriate steps to ensure data privacy and
                                security through various hardware and software methodologies. However, we cannot guarantee
                                complete security for information disclosed online.”
                            </li>
                        </ul>
                        <hr />
                        <h4>12. Policy Updates</h4>
                        <ul>
                            <li>
                                This Privacy Policy may be updated periodically to reflect changes in our services, legal
                                requirements, or industry standards. Updates will be posted on this page, and the “Last
                                Updated” date will be revised accordingly. Customers are encouraged to review this policy
                                frequently.
                            </li>
                        </ul>
                        <hr />
                        <h4>13. Contact Information</h4>
                        <ul>
                            <li>Email: Info@atlas-alarab.com</li>
                            <li>Phone: +971409047817</li>
                        </ul>
                    </div>
                    <div id="cancellationContent" class="content-section" style="display: none;">
                        <h2>Cancellation Policy</h2>
                        <div id="cancellationPolicyDiv">

                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- // CHECKOUT MODAL CONTENT END  -->
<?php
        $modalHtml = ob_get_clean();
        wp_send_json_success($modalHtml);
    } else {
        wp_send_json_error('Failed to fetch experience details.');
    }
}
function cbkn_fetch_languages_list()
{
    $cache_key = 'bokun_languages_list';
    // Check if the transient already exists
    $languages = get_transient($cache_key);
    if (false === $languages) {
        // If transient does not exist, fetch languages from the Bokun API
        $path = '/language.json/findAll';
        $method = 'GET';
        // Authenticate and fetch data from the Bokun API
        $response = authenticateBokunApi($method, $path);
        if ($response && is_array($response)) {
            // Store the fetched languages in a transient for 24 hours
            set_transient($cache_key, $response, DAY_IN_SECONDS);
            $languages = $response;
        } else {
            return new WP_Error('api_error', 'Failed to fetch languages from Bokun API.');
        }
    }
    return $languages;
}
function cbkn_render_language_dropdown($default_lang)
{
    $languages = cbkn_fetch_languages_list();
    if (is_wp_error($languages)) {
        echo '<p>Error fetching languages: ' . $languages->get_error_message() . '</p>';
        return;
    }
    echo '<select class="custom-bokun-dropdown language-dropdown">';
    foreach ($languages as $language) {
        $flag = esc_attr($language['flag']);
        $code = esc_attr($language['code']);
        $language_name = cbkn_get_language_full_name($code); // Get full language name dynamically
        echo "<option value='{$code}' data-flag='{$flag}' " . ($default_lang == $code ? "selected" : "") . ">
                <span class='flag-icon flag-icon-{$flag}'></span> {$language_name}
              </option>";
    }
    echo '</select>';
}
function cbkn_get_language_full_name($code)
{
    $language_names = [
        'de' => 'German',
        'en' => 'English',
        'en_US' => 'English (US)',
        'es' => 'Spanish',
        'fr' => 'French',
        'it' => 'Italian',
        'pt' => 'Portuguese',
        'ru' => 'Russian',
        'zh' => 'Chinese',
    ];
    return $language_names[$code] ?? ucfirst($code);
}
