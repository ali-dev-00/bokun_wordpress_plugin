<?php

if ( ! defined( 'ABSPATH' ) ) {
	die;
} 

class WC_Cart_Donation_Campaigns {

	public function __construct() {

		add_action( 'wp_footer', array( $this, 'render_donation_campaign_popup' ) );
		if ( 'yes' == get_option( 'wc-donation-on-cart' ) ) {
		
			add_action('init', array( $this, 'wc_donation_cart_position' ));
	
			add_action( 'woocommerce_after_cart_table', array( __CLASS__, 'wc_donation_campaign_popup_display_button' ) );

		}
		add_action('woocommerce_after_shop_loop_item_title', array( $this, 'add_product_description_in_loop' ), 9999);
	}

	/**
	 * Add description in single page and shortcode.
	 * Add small description in shop page and cart.
	 * 
	 * @since 3.7
	*/
	public function add_product_description_in_loop() {
		global $product;

		if ( !$product ) {
			return;
		}   
		
		// Get the product ID
		$product_id          = $product->get_id();
		$campaign_product_id = get_post_meta($product_id, 'wc_donation_campaign', true);
		if ( ! empty($campaign_product_id ) ) {
			$product_description = $product->get_short_description();
		}
		// Display the product description if it's not empty
		if (!empty($product_description)) {
			echo '<div class="woocommerce-product-description">';
			echo wp_kses_post($product_description);
			echo '</div>';
		}
	}

	public function wc_donation_cart_position() {

		$cart_position = get_option( 'wc-donation-cart-location' );
		$position_hook = 'woocommerce_after_cart_table';
		$campaign_type = get_option( 'wc-donation-campaign-display-type' );

		if ( ! empty( $cart_position ) ) {

			if ( 'before_cart_table' == $cart_position ) {
				$position_hook = 'woocommerce_before_cart_table';
			} elseif ( 'after_cart' == $cart_position ) {
				$position_hook = 'woocommerce_after_cart';
			}

		}

		if ( 'page' == $campaign_type || empty( $campaign_type ) ) {
			add_action( $position_hook, array( __CLASS__, 'display_wc_donation_on_cart' ), 10, 0 );
		}
	}

	public static function display_wc_donation_on_cart( $campaign_ids = array() ) {

		if ( empty( $campaign_ids ) ) {
			$campaign_ids = !empty( get_option( 'wc-donation-cart-product' ) ) ? get_option( 'wc-donation-cart-product' ) : array();
		}
		
		if ( is_array( $campaign_ids ) && count( $campaign_ids ) > 0 ) {
			
			if ( 'table' != get_option( 'wc-donation-cart-campaign-format-type' ) ) { 
				?>
				<div id='wc-donation-type-<?php esc_attr_e( get_option( 'wc-donation-cart-campaign-format-type' ) ); ?>'>
				<?php 
				foreach ( $campaign_ids as $campaign_id ) {
					$post_exist = get_post( $campaign_id );
					if ( ! empty( $post_exist ) && ( isset( $post_exist->post_status ) && 'trash' !== $post_exist->post_status ) ) {
						$object = WcdonationCampaignSetting::get_product_by_campaign( $campaign_id );
	
						extract( self::cart_campaign_template_data( $object ) );
	
						echo '<div class="wc_donation_on_cart ' . esc_attr( get_option( 'wc-donation-cart-campaign-format-type' ) ) . '" id="wc_donation_on_cart">';
						/**
						* Action.
						* 
						* @since 3.4.5
						*/
						do_action ('wc_donation_before_cart_add_donation', $campaign_id);
						include self::cart_campaign_format_type_template();

						/**
						* Action.
						* 
						* @since 3.4.5
						*/
						do_action ('wc_donation_after_cart_add_donation', $campaign_id);
						echo '</div>';
					} else {
						/* translators: %1$s refers to html tag, %2$s refers to html tag */
						printf(esc_html__('%1$s Campaign deleted by admin %2$s', 'wc-donation'), '<p class="wc-donation-error">', '</p>' );
						return;
					}
				} 
				?>
				</div>
				<?php 
			} else {
				include self::cart_campaign_format_type_template( );
			}           
			
		}
	}

	public static function wc_donation_campaign_popup_display_button() {

		if ( ! empty( get_option( 'wc-donation-cart-product' ) ) ) {

			$campaign_display_type   = get_option( 'wc-donation-campaign-display-type' );
			$campaign_display_format = get_option( 'wc-donation-cart-campaign-display-format' );
			$button_title            = get_option( 'wc-donation-cart-campaign-popup-button-title' );

			if ( empty( $button_title ) ) {
				$button_title = esc_html__( 'View Campaigns', 'wc-donation' );
			}
			if ( 'popup' == $campaign_display_type ) {
				
				if ( empty( $campaign_display_format ) || 'button_display' == $campaign_display_format ) { 
					?>
					<button type="button" class="button" onclick="document.getElementById('wc-donation-popup').classList.add('wc-popup-show'); document.getElementsByTagName('body')[0].classList.add('stopScroll');"><?php esc_attr_e( $button_title ); ?></button>
					<?php 
				}
			}
		}
	}

	public  function render_donation_campaign_popup() {
		
		global $post;

		if ( is_shop() ) {
			$post_id = get_option( 'woocommerce_shop_page_id' );
		} else {
			$post_id = ! empty( $post ) ? $post->ID : 0;
		}

		$post_data = get_post( $post_id );

		if ( isset( $post_data->post_content ) ) {

			$blocks = parse_blocks($post_data->post_content);
			$attrs  = array();

			if ( is_array( $blocks ) && count( $blocks ) > 0 ) {
				foreach ( $blocks as $block ) {
					if ( 'wc-donation/shortcode' == $block['blockName'] ) {
						$attrs = $block['attrs'];
						break;
					}
				}
			}
		}


		if ( isset( $attrs['is_block'] ) && ! empty( $attrs['donation_ids'] ) ) {

			if ( ! isset( $attrs['display_button'] ) ) {
				$attrs['display_button'] = 'auto_display';
			}

			if ( ! isset( $attrs['formattypes'] ) ) {
				$attrs['formattypes'] = 'block';
			}

			$popup_title = isset( $attrs['popup_header'] ) && ! empty( $attrs['popup_header'] ) ? $attrs['popup_header'] : esc_html__( 'Campaigns', 'wc-donation' );
			$class       = '';        
			  
			if ( isset( $attrs['displaytype'] ) && 'popup' == $attrs['displaytype'] && isset( $attrs['display_button'] ) && 'auto_display' == $attrs['display_button'] ) {
				$class = 'wc-popup-show';
				?>
				<script type="text/javascript">
					document.getElementsByTagName('body')[0].classList.add('stopScroll');
				</script>
				<?php
			}

			?>
				<div class="wc-donation-popup cart-campaign-popup <?php esc_attr_e( $class ); ?>" id="wc-donation-popup-block">
					<div class="wc-donation-popup-backdrop"></div>
					<div class="wc-donation-popup-content-cart">
						<div class="wc-donation-popup-header">
							<span class="wc-close">x</span>
							<h3><?php esc_attr_e( $popup_title ); ?></h3>
						</div>
						<div class="wc-donation-popup-body">
							<div class="woocommerce-notices-wrapper" id="wc-donation-woocommerce-notices-wrapper">
								<div class="wc-donation-woocommerce-message">
									<?php esc_html_e( 'Donation Added to Cart.', 'wc-donation' ); ?>
								</div>
							</div>
							<div class="wc_donation_on_cart_popup">
								<?php WC_Cart_Donation_Campaigns_Block::display_wc_donation_on_cart_block( $attrs ); ?>
							</div>
						</div>
					</div>
				</div>		
			<?php

		} elseif ( 'yes' == get_option( 'wc-donation-on-cart' ) && ! empty( get_option( 'wc-donation-cart-product' ) ) && ! has_block( 'woocommerce/cart', get_the_ID() ) ) {
			
			$class                   = '';
			$campaign_type           = get_option( 'wc-donation-campaign-display-type' );
			$campaign_display_format = get_option( 'wc-donation-cart-campaign-display-format' );
			$popup_title             = get_option( 'wc-donation-cart-campaign-popup-title' );
			
			if ( 'auto_display' == $campaign_display_format && is_cart() && 'popup' == $campaign_type ) {
				$class = 'wc-popup-show';
				?>
					<script type="text/javascript">
						document.getElementsByTagName('body')[0].classList.add('stopScroll');
					</script>
				<?php
			}
				
			if ( empty( $popup_title ) ) {
				$popup_title = esc_html__( 'Campaigns', 'wc-donation' );
			}

			if ( 'popup' == $campaign_type ) {
				?>
					<div class="wc-donation-popup cart-campaign-popup <?php esc_attr_e( $class ); ?>" id="wc-donation-popup">
						<div class="wc-donation-popup-backdrop"></div>
						<div class="wc-donation-popup-content-cart">
							<div class="wc-donation-popup-header">
								<span class="wc-close">x</span>
								<h3><?php esc_attr_e( $popup_title ); ?></h3>
							</div>
							<div class="wc-donation-popup-body">
								<div class="woocommerce-notices-wrapper" id="wc-donation-woocommerce-notices-wrapper">
									<div class="wc-donation-woocommerce-message">
									<?php esc_html_e( 'Donation Added to Cart.', 'wc-donation' ); ?>
									</div>
								</div>
								<div class="wc_donation_on_cart_popup">
								<?php self::display_wc_donation_on_cart(); ?>
								</div>
							</div>
						</div>
					</div>
					<?php
			}
		}       
	}

	public static function cart_campaign_format_type_template() {

		$type = get_option( 'wc-donation-cart-campaign-format-type', 'block' );
		if ( empty( $type ) ) {
			$type = 'block';
		}

		if ( file_exists( get_stylesheet_directory() . '/wc-donation/views/frontend/cart/cart-campaign-' . $type . '.php' ) ) {
			return get_stylesheet_directory() . '/wc-donation/views/frontend/cart/cart-campaign-' . $type . '.php';
		} else {
			return ( WC_DONATION_PATH . 'includes/views/frontend/cart/cart-campaign-' . $type . '.php' );
		}
	}

	public static function cart_campaign_template_data( $object ) {

		if ( get_woocommerce_currency_symbol() ) {
			$currency_symbol =  get_woocommerce_currency_symbol();
		}
		$_type                      = 'cart';
		$wp_rand                    = wp_rand( 1, 999 );
		$donation_product           = !empty( $object->product['product_id'] ) ? $object->product['product_id'] : '';
		$donation_values            = !empty( $object->campaign['predAmount'] ) ? $object->campaign['predAmount'] : array();
		$donation_value_labels      = !empty( $object->campaign['predLabel'] ) ? $object->campaign['predLabel'] : array();
		$donation_min_value         = !empty( $object->campaign['freeMinAmount'] ) ? $object->campaign['freeMinAmount'] : 0;
		$donation_max_value         = !empty( $object->campaign['freeMaxAmount'] ) ? $object->campaign['freeMaxAmount'] : '';
		$display_donation           = !empty($object->campaign['amount_display']) ? $object->campaign['amount_display'] : 'both';
		$where_currency_symbole     = !empty($object->campaign['currencyPos']) ? $object->campaign['currencyPos'] : 'before';
		$donation_label             = !empty( $object->campaign['donationTitle'] ) ? $object->campaign['donationTitle'] : '';
		$donation_button_text       = !empty( $object->campaign['donationBtnTxt'] ) ? $object->campaign['donationBtnTxt'] : esc_attr__('Donate', 'wc-donation');
		$donation_button_color      = !empty( $object->campaign['donationBtnBgColor'] ) ? $object->campaign['donationBtnBgColor'] : '333333';
		$donation_button_text_color = !empty( $object->campaign['donationBtnTxtColor'] ) ? $object->campaign['donationBtnTxtColor'] : 'FFFFFF';
		$display_donation_type      = !empty( $object->campaign['DonationDispType'] ) ? $object->campaign['DonationDispType'] : 'select';
		
		$RecurringDisp  = !empty( $object->campaign['RecurringDisp'] ) ? $object->campaign['RecurringDisp'] : 'disabled';
		$recurring_text = !empty( $object->campaign['recurringText'] ) ? $object->campaign['recurringText'] : 'Make it recurring for';
		$causeDisp      = !empty( $object->campaign['causeDisp'] ) ? $object->campaign['causeDisp'] : 'hide';
		$causeNames     = !empty( $object->campaign['causeNames'] ) ? $object->campaign['causeNames'] : array();
		$causeDesc      = !empty( $object->campaign['causeDesc'] ) ? $object->campaign['causeDesc'] : array();
		$causeImg       = !empty( $object->campaign['causeImg'] ) ? $object->campaign['causeImg'] : array();
		/**
		 * Donation Goal Settings
		 */
		$goalDisp = !empty( $object->goal['display'] ) ? $object->goal['display'] : '';
		$goalType = !empty( $object->goal['type'] ) ? $object->goal['type'] : '';
		
		$get_donations = WcdonationSetting::has_bought_items( $donation_product );
		
		$progressBarColor = !empty( $object->goal['progress_bar_color'] ) ? $object->goal['progress_bar_color'] : '';
		$dispDonorCount   = !empty( $object->goal['display_donor_count'] ) ? $object->goal['display_donor_count'] : '';
		$closeForm        = !empty( $object->goal['form_close'] ) ? $object->goal['form_close'] : '';
		$message          = !empty( $object->goal['message'] ) ? $object->goal['message'] : '';
		
		$progressOnWidget = !empty( $object->goal['show_on_widget'] ) ? $object->goal['show_on_widget'] : '';
		
		$donation_tributes = get_option( 'wc-donation-tributes' );
		$all_tributes      = !empty( $object->campaign['tributes'] ) ? $object->campaign['tributes'] : array();
		$donation_gift_aid = get_option( 'wc-donation-gift-aid' );
		
		// var_dump(get_option( 'wc-donation-gift-aid-area', array() ));
		
		if ( !is_array( get_option( 'wc-donation-gift-aid-area', array() ) ) ) {    
			$donation_gift_aid_area[] = get_option( 'wc-donation-gift-aid-area', array() );
		} else {    
			$donation_gift_aid_area = get_option( 'wc-donation-gift-aid-area', array() );
		}
		
		$donation_gift_aid_title          = get_option( 'wc-donation-gift-aid-title' );
		$donation_gift_aid_checkbox_title = ! empty( get_option( 'wc-donation-gift-aid-checkbox-title' ) ) ? get_option( 'wc-donation-gift-aid-checkbox-title' ) : __('Yes, I would like to claim Gift Aid', 'wc-donation');
		$donation_gift_aid_explanation    = get_option( 'wc-donation-gift-aid-explanation' );
		$donation_gift_aid_declaration    = get_option( 'wc-donation-gift-aid-declaration' );
		$is_cart                          = is_cart();
		$is_checkout                      = is_checkout();
		
		$blocks = ( is_array($object->campaign['ordering']) && count($object->campaign['ordering']) > 0 ) ? $object->campaign['ordering'] : array(
			'amount',
			'cause',
			'tribute',
			'gift-aid',
			'extra-fee',
			'subscription',
			'main-goal',
			'button',
			'extra-fee-summary',
		);

		return compact(
			'_type',
			'currency_symbol',
			'wp_rand',
			'donation_product',
			'donation_values',
			'donation_value_labels',
			'donation_min_value',
			'donation_max_value',
			'display_donation',
			'where_currency_symbole',
			'donation_label',
			'donation_button_text',
			'donation_button_color',
			'donation_button_text_color',
			'display_donation_type',
			'RecurringDisp',
			'recurring_text',
			'causeDisp',
			'causeNames',
			'causeDesc',
			'causeImg',
			'goalDisp',
			'goalType',
			'get_donations',
			'progressBarColor',
			'dispDonorCount',
			'closeForm',
			'message',
			'progressOnWidget',
			'donation_tributes',
			'all_tributes',
			'donation_gift_aid',
			'donation_gift_aid_area',
			'donation_gift_aid_title',
			'donation_gift_aid_checkbox_title',
			'donation_gift_aid_explanation',
			'donation_gift_aid_declaration',
			'is_cart',
			'is_checkout',
			'blocks'
		);
	}
}

( new WC_Cart_Donation_Campaigns() );
