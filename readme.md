<meta name="google-site-verification" content="XXfTEZS2EJCrpvdgEnJhpyUydRtJDf_F3d05JELdXYo" />
<script src="https://cdn.keepcart.co/blocking.js"></script> 

<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K7BQ28JT');</script>
<!-- End Google Tag Manager -->
<script>
	jQuery(function(){
		jQuery("#nootropics").addClass('active');
		jQuery("#nootropics-tab").addClass('active');
		//console.log('test with new');
	});
</script>
<script>
window._Sendlane = window._Sendlane || [];
</script>
<!-- Add to header.php or via plugin like "Insert Headers and Footers" -->

<script src="https://sendlane.com/scripts/pusher.js" async data-token="935951d3-f9d4-4d61-b2f0-501db05d689f"></script>
<script>
jQuery(document).ready(function($) {
    if ($('.type-product').length) {
        const productId = $('input[name="product_id"]').val() || $('.single_add_to_cart_button').val();
        if (productId) {
            _Sendlane.push({
                "event": "product_viewed",
                "product_id": productId
            });
        }
    }
});
</script>
<script>
jQuery('.single_add_to_cart_button').on('click', function() {
    console.log("Add to cart clicked");
    console.log("Sending event for product 62440");
    
    _Sendlane.push({
        "event": "added_to_cart",
        "line_items": [{
            "product_id": "62440"
        }]
    });
    
    return true;
});
</script> 
<script>
jQuery(document).ready(function($) {
    if ($('form.woocommerce-checkout').length) {
        const lineItems = [];
        
        $('.cart_item').each(function() {
            const $item = $(this);
            lineItems.push({
                product_id: $item.find('.product-id').val(),
                product_name: $item.find('.product-name').text(),
                quantity: parseInt($item.find('input.qty').val()),
                item_price: $item.find('.product-price .amount').text(),
                total: $item.find('.product-subtotal .amount').text()
            });
        });

        _Sendlane.push({
            "event": "checkout_started",
            "checkout_id": $('.woocommerce-checkout').data('order_review'),
            "status": "pending",
            "checkout_url": window.location.href,
            "subtotal": $('.cart-subtotal .amount').text(),
            "total": $('.order-total .amount').text(),
            "currency": "USD",
            "line_items": lineItems
        });
    }
});
</script>
<script>
jQuery(document).ready(function($) {
    const userEmail = $('.woocommerce-customer-details .email').text() || 
                     $('[data-customer_email]').data('customer_email');
    if (userEmail) {
        _Sendlane.push({
            "event": "identify",
            "email": userEmail
        });
    }
});
</script>
<script>
jQuery(document).ready(function($) {
    if ($('.woocommerce-order-received').length) {
        const orderId = $('.woocommerce-order').data('order_id');
        if (orderId) {
            _Sendlane.push({
                "event": "order_completed",
                "order_id": orderId
            });
        }
    }
});
</script>
<script>
_Sendlane.push({
    event_id: 'f8uEerYnp5WRy'
});
</script>

<script>
window._Sendlane = window._Sendlane || [];
</script>
<script>
    jQuery(document).ready(function($) {
        console.log("Page refreshed - triggering custom event");
    
        _Sendlane.push({
            "event": "identify",
            "email": "test@test.com"
        });
    });
    </script>
<script>
_Sendlane.push({
    event_id: 'FaBsaICEdG6eS'
});
</script>