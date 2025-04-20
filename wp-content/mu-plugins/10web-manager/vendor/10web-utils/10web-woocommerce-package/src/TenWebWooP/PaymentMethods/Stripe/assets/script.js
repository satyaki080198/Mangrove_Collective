window.twwp_checkout = {
  $initialized: false,
  $checkout_form: jQuery('form.checkout'),
  $block_checkout: false,
  $paymentNeeded: true,
  $intentData:null,
  $paymentClientSecret:null,
  $intentId:null,
  $elements:null,


  $options: { stripeAccount: twwp_config.stripe_account_id },
  init: function() {
    if(twwp_config.edit_page === 'yes') {
      return;
    }
    if (0 === jQuery('form.checkout').length) {
      this.$checkout_form = jQuery('form.wc-block-checkout__form');
      this.$block_checkout = true;
    }
    else {
      this.$checkout_form = jQuery('form.checkout');
    }
    if ('undefined' != typeof Stripe && jQuery('#twwp-card-element').length) {
      if (!this.$initialized) {
        this.stripe = Stripe(twwp_config.stripe_public_key, this.$options);
        this.initPayment();

        this.$checkout_form.on('checkout_place_order_tenweb_payments_stripe', function(event, wc_checkout_form) {
          let $form = jQuery( this );
          event.preventDefault();
          if(window.twwp_checkout.$paymentNeeded) {
            window.twwp_checkout.handle10WebPay(event, wc_checkout_form, $form, window.twwp_checkout.$elements);
            return false;
          }
        });
        this.$initialized = true;
      }
      else if (!jQuery('#twwp-card-element').hasClass('StripeElement')) {
        if (window.twwp_checkout && window.twwp_checkout.paymentElement && typeof window.twwp_checkout.paymentElement.mount === 'function') {
          window.twwp_checkout.paymentElement.mount('#twwp-card-element');
        }
      }
    }
  },

  /**
   * Initializes the Stripe payment process on the webpage.
   * This function performs the following tasks:
   * 1. Awaits the completion of the `setPaymentIntent` function to set up the payment intent on the server
   *    and obtain the client secret required for Stripe payment processing.
   * 2. Defines appearance settings for the Stripe Payment Element to customize its look and feel.
   * 3. Configures options for the Payment Element, such as which fields to display or hide.
   *    Note: The country field configuration should be adjusted based on actual requirements.
   * 4. Creates a Stripe Payment Element instance using the client secret and appearance settings.
   * 5. Mounts the Payment Element to the specified DOM element with the ID 'twwp-card-element'.
   * 6. Sets up an event listener to handle changes in the Payment Element, displaying error messages if any
   *    occur during user input.
   */
  initPayment: async function() {
    try {
      // Asynchronously set the payment intent for the transaction
      await this.setPaymentIntent();

      // Define the appearance settings for the Payment Element (these settings are not provided in the code)
      let variables = {};
      if(typeof twwp_config.payment_text_color !== 'undefined') {
        variables.colorText = twwp_config.payment_text_color;
      }
      variables.fontFamily = 'Inter';
      const appearance = {
        theme: 'stripe',
        variables: variables
      };

      // Configure options for the payment element, particularly focusing on fields to display
      const options = {
        fields: {
          billingDetails: {
            address: {
              country: 'never',
            },
          }
        },
        wallets: {
          applePay: 'auto',
          googlePay: 'auto',
        },
        paymentMethodOrder: [
          'card',
          'googlePay',
          'applePay',
          // TODO: Add other payment methods here
        ],
      };
      // Retrieve the client secret for the payment intent, which is required to authenticate the payment
      let clientSecret = this.$paymentClientSecret;

      // Initialize Stripe elements with the client secret and appearance settings
      window.twwp_checkout.$elements = this.stripe.elements({ clientSecret, appearance });

      // Create the payment element using the Stripe elements instance with specified options
      window.twwp_checkout.paymentElement = this.$elements.create('payment', options);

      // Mount the payment element to the specified DOM element
      window.twwp_checkout.paymentElement.mount('#twwp-card-element');
      // Add an event listener to handle changes in the payment element and display errors if any
      window.twwp_checkout.paymentElement.on('change', function(event) {
        // Get the element where error messages will be displayed
        var displayError = jQuery('#twwp-card-errors');

        // If there's an error in the payment element, display the error message
        if (event.error) {
          displayError.text(event.error.message);
        } else {
          // Clear the error message if no error is present
          displayError.text('');
        }
      });
    }catch (error) {
      console.error('Error retrieving new clientSecret:', error);
    }



  },
  getPaymentIntentFromSession: function() {
    const cookieHash = twwp_config.cookiehash;
    if (cookieHash) {
      var paymentIntent = Cookies.get('twwp_payment_intent_' + cookieHash);
      if (paymentIntent) {
        paymentIntent = JSON.parse(paymentIntent);
        const intentId = paymentIntent['intentId'];
        const clientSecret = paymentIntent['clientSecret'];
        const cartHash = paymentIntent['cartHash'];
        return { intentId, clientSecret,  cartHash};
      }
    }
    return {};
  },
  deletePaymentIntentFromSession: function() {
    this.$intentData = null;
    this.$paymentClientSecret = null;
    this.$intentId = null;
    const cookieHash = twwp_config.cookiehash;
    if (cookieHash) {
      Cookies.remove('twwp_payment_intent_' + cookieHash, {path: twwp_config.cookiepath});
    }
    // TODO: find the best way to generate a new payment intent
  },
  blockForm: function () {
    if (!this.$block_checkout) {
      this.$checkout_form.addClass( 'processing' ).block( {
        message: null,
        overlayCSS: {
          background: '#fff',
          opacity: 0.6
        }
      } );
    }
  },
  unblockForm: function () {
    if (!this.$block_checkout) {
      this.$checkout_form.removeClass( 'processing' ).unblock();
    }
  },

  /**
   * Handles payment intent actions such as create, update, and retrieve intent data.
   * Sends necessary data via POST to the server and processes the response.
   *
   * @param {string} action - The action to be performed (e.g., 'create', 'update').
   * @param {string} intentId - The ID of the payment intent.
   * @param {string|null} [order_id=null] - Optional order ID if available.
   * @returns {Promise<Object>} - A Promise that resolves to an object containing intentId and clientSecret, or an empty object if unsuccessful.
   */
  paymentIntentActions: async function(action, intentId, order_id = null) {
    let formData = new FormData();
    formData.append('action', 'twwp_stripe_create_intent');
    formData.append('nonce', twwp_config.ajaxnonce);
    formData.append('intentAction', action);
    formData.append('intentId', intentId);
    if(order_id) {
      formData.append('order_id', order_id);
    }
    // Sends a POST request to the server using the provided form data to either create or update a payment intent.
    const response = await fetch(twwp_config.ajaxurl, {
      method: "POST",
      body: formData,
    });

    const { success, data } = await response.json();
    // Fetch updates for the PaymentIntent to reflect any changes (e.g., new amount).
    if(action ==='update' && window.twwp_checkout.$elements){
      await window.twwp_checkout.$elements.fetchUpdates();
    }
    if (success === true) {
      const { intentId, clientSecret } = data;
      return { intentId, clientSecret };
    }
    return {};
  },

  setPaymentIntent: async function(){
    const cartHash = Cookies.get('woocommerce_cart_hash'); // Get the current cart hash from cookies
    let paymentIntentAction = 'create';
    try {
      // Retrieve payment intent from session
      this.$intentData = await this.getPaymentIntentFromSession();

      if (this.$intentData.intentId) {
        // If an intent ID exists, prepare to update it
        paymentIntentAction = 'update';
        this.$intentId = this.$intentData.intentId;
      }

      // Check if the cart hash matches; if not, update or create payment intent
      if (cartHash !== this.$intentData.cartHash) {
        this.$intentData = await this.paymentIntentActions(paymentIntentAction, this.$intentId);
        if(paymentIntentAction === 'update' && Object.keys(this.$intentData).length === 0){
          this.deletePaymentIntentFromSession();
          await this.setPaymentIntent();
        }
      }

      // Store the client secret and intent ID from the payment intent data
      this.$paymentClientSecret = this.$intentData.clientSecret;
      this.$intentId = this.$intentData.intentId;
    }catch (error) {

    }
  },

  /**
   * Asynchronously validates the checkout form by sending a POST request
   * to the WooCommerce checkout URL with serialized form data.
   *
   * @param {jQuery} form - The jQuery object representing the form to be validated.
   * @returns {Promise} - A promise that resolves with the response if the request is successful, or rejects with an error if the request fails.
   */
  validateCheckoutForm: async function(form, intentId) {
    // Convert the form element to FormData object for easier manipulation
    const formData = new FormData(form[0]);
    const cookieHash = twwp_config.cookiehash;
    // Append a custom field to indicate the validation action
    formData.append('twwp_checkout_validation', 'true');
    formData.append('intent_id', intentId);
    formData.append('intent_cookie_id', 'twwp_payment_intent_' + twwp_config.cookiehash);

    // Serialize the FormData object to a query string format for AJAX submission
    const formDataSerialized = new URLSearchParams(formData).toString();

    // Return a promise to handle the asynchronous AJAX request
    return new Promise((resolve, reject) => {
      // Make an AJAX request to the checkout URL with the serialized form data
      jQuery.ajax({
        type: 'POST',
        url: wc_checkout_params.checkout_url,
        data: formDataSerialized,
        dataType: 'json',
      })
          .done(response => resolve(response))
          .fail((jqXHR, textStatus, errorThrown) => reject(errorThrown));
    });
  },
  /**
   * handle10WebPay - Handles the payment process during checkout using Stripe.
   * This function validates the checkout form, retrieves or updates the payment intent,
   * creates a payment method, and confirms the payment with Stripe. It manages form
   * blocking/unblocking and handles any errors that occur during the process.
   *
   * @param {Object} event - The event object from the checkout submission.
   * @param {Object} wc_checkout_form - The WooCommerce checkout form object.
   * @param {Object} $form - The jQuery object of the checkout form.
   */
  handle10WebPay: async function(event, wc_checkout_form, $form,elements) {
    // Block the checkout form to prevent multiple submissions
    window.twwp_checkout.blockForm();

    // Validate the checkout form
    let validate_data = await this.validateCheckoutForm($form, this.$intentId);
    if(typeof validate_data.order_id !== 'undefined') {
      this.$intentData = await this.paymentIntentActions('update', this.$intentId, validate_data.order_id);
    }
    if (validate_data.result !== "validation_success") {
      // If validation fails, unblock the form and display an error message
      window.twwp_checkout.unblockForm();
      if (validate_data.messages) {
        wc_checkout_form.submit_error(validate_data.messages);
      }
      return false;
    }
    try {
      if (this.$paymentClientSecret) {
        // Append intent ID to the form as a hidden input
        window.twwp_checkout.$checkout_form.find('.twwp_intentId').remove(); // Corrected the usage to find the element before removing
        window.twwp_checkout.$checkout_form.append(`<input class="twwp_intentId" type='hidden' name='intentId' value='${this.$intentId}'>`);
        const name = jQuery('#billing_first_name').length && jQuery('#billing_last_name').length ?
            jQuery('#billing_first_name').val() + ' ' + jQuery('#billing_last_name').val() : undefined;

        const postal_code = jQuery('#billing_postcode').length ? jQuery('#billing_postcode').val() : undefined;
        const billing_country = jQuery('#billing_country').length ? jQuery('#billing_country').val() : undefined;
        const billing_phone = jQuery('#billing_phone').length ? jQuery('#billing_phone').val() : undefined;
        const billing_state = jQuery('#billing_state').length ? jQuery('#billing_state').val() : undefined;
        const billing_email = jQuery('#billing_email').length ? jQuery('#billing_email').val() : undefined;

// Prepare billing details object
        const billingDetails = {};
        if (name) billingDetails.name = name;
        if (billing_email) billingDetails.email = billing_email;
        if (billing_phone) billingDetails.phone = billing_phone;
        if (billing_state || postal_code || billing_country) {
          billingDetails.address = {};
          if (billing_state) billingDetails.address.state = billing_state;
          if (postal_code) billingDetails.address.postal_code = postal_code;
          if (billing_country) billingDetails.address.country = billing_country;
        }

        const result = await window.twwp_checkout.stripe.confirmPayment({
          elements,
          confirmParams: {
            payment_method_data: {
              billing_details: billingDetails
            }
          },
          redirect: 'if_required',
        });
        if (result.error) {
          if(result.error.code === 'payment_intent_unexpected_state'){
            await this.deletePaymentIntentFromSession();
          }
          window.twwp_checkout.unblockForm();
          wc_checkout_form.submit_error(`<div class="woocommerce-error">Payment failed: ${result.error.message}.</div>`);
        } else {
          // Payment succeeded, unblock the form and submit it to complete the order
          window.twwp_checkout.$paymentNeeded = false;
          window.twwp_checkout.unblockForm();
          window.twwp_checkout.$checkout_form.trigger('submit');
        }
      } else {
        // Payment intent not found
        throw new Error('Payment intent not found.');
      }
    } catch (error) {
      console.log(error);
      // Catch and handle any errors
      window.twwp_checkout.unblockForm();
      wc_checkout_form.submit_error(`<div class="woocommerce-error">${error.message}</div>`);
    }
  },
  resetFields: function(field_ids) {
    jQuery('#twwp_payengine_card_token').remove();
    jQuery('#twwp_payengine_browser_info').remove();
    jQuery('#twwp_payengine_3ds_succeeded').remove();
    window.twwp_checkout.$performing3ds = false;
    window.twwp_checkout.$3dsresponse = false;
  }
};
jQuery(document).ready(function(){
  jQuery('body').on('updated_checkout', function () {
    window.twwp_checkout.init();
  });
});

window.addEventListener( 'elementor/frontend/init', () => {
  // The first one should be a general solution, unfortunately it does not work, so had to use this one. This will work for one widget only.
  elementorFrontend.hooks.addAction( 'frontend/element_ready/twbb_woocommerce-checkout-page.default', function ( $scope ) {
    window.twwp_checkout.init();
  });
} );
