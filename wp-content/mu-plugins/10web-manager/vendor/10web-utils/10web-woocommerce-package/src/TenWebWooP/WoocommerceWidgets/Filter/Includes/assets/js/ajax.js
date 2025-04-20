jQuery(document).ready(function() {
    let twwf_form_id = '';
    let twwf_ajax = 'yes';
    let twwf_filter_reset = false;
    jQuery('.tww_filter_form .twwf_price_slider').on( "slidechange", function( event, ui ) {
        if(twwf_filter_reset){
            return;
        }
        twwfProductsAjaxFilter(jQuery(this));
    });
    jQuery(document).on('change', '.tww_filter_form :input', function() {
        if(twwf_filter_reset){
            twwf_filter_reset = false;
            return
        }
        twwfProductsAjaxFilter(jQuery(this))
    });

    jQuery(document).on('click', '.twwf_filtered_field', function() {
        twwf_change_filter(jQuery(this));
        twwfProductsAjaxFilter(jQuery(this));
    });

    jQuery(document).on('click', '.twwf_reset_filtered_fields', function (){
        let twwf_filtered_field = jQuery(this).closest('form').find('.twwf_filtered_field');
        jQuery(this).closest('form').find('.twwf_hide_cat').removeClass('twwf_hide_cat');
        twwf_filtered_field.each(function (){
            twwf_change_filter(jQuery(this))
        })
        twwfProductsAjaxFilter(jQuery(this));
    })
    function twwf_set_url(twwf_main_form){
        let state_url =  window.location.origin+window.location.pathname;
        let origForm = twwf_main_form.serialize();
        twwf_main_form.find('.twwf_filtered_field_parent').each(function (){
            let main_url = jQuery(this).data('main_url');
            jQuery(this).attr('href',main_url+'?'+origForm);
        })
        let url_ajax = window.location.origin+window.location.pathname+"?"+origForm;
        let twwf_ajax_beautify_url = twwf_main_form.data('url_beautify');
        twwf_ajax = twwf_main_form.data('ajax');
        if(twwf_ajax_beautify_url == 'yes' && twwf_ajax == 'yes'){
            let filter_data_array = twwf_main_form.serializeArray();
            let url_arr = {};
            let prices = '';
            let price_slug = '';
            let min_price_input= twwf_main_form.find('.twwf_min_price_input')
            let max_price_input= twwf_main_form.find('.twwf_max_price_input')
            filter_data_array.map(function(item) {
                let selected_filter_element = twwf_main_form.find('input[name="'+item.name+'"][value="'+item.value+'"], select[name="'+item.name+'"] option[value="'+item.value+'"]');
                let data_variation = selected_filter_element.data('variation');
                let data_field_slug = selected_filter_element.data('field_slug');
                let data_option_slug = selected_filter_element.data('option_slug');
                if(data_field_slug != undefined){
                    data_field_slug = '_'+data_field_slug;
                    if(data_variation === 'price'){
                        price_slug = data_field_slug;
                    }else{
                        if(url_arr[data_field_slug] == undefined){
                            url_arr[data_field_slug] = [];
                        }
                        url_arr[data_field_slug].push(data_option_slug);
                    }
                }else if(selected_filter_element.hasClass('twwf_additional_params')){
                    if(url_arr[item.name] == undefined){
                        url_arr[item.name] = [];
                    }
                    url_arr[item.name].push(item.value);
                }
            });
            if(parseInt(min_price_input.val()) != parseInt(min_price_input.data('min')) || parseInt(max_price_input.val()) != parseInt(max_price_input.data('max'))){
                prices = min_price_input.val()+'-'+max_price_input.val();
            }



            if(prices && price_slug){
                url_arr[price_slug] = [];
                url_arr[price_slug].push(prices);
            }

            let filter_get_params='';
            jQuery.each(url_arr, function (key, values){
                filter_get_params += key+'='+values.join(',')+'&';
            });
            state_url = state_url.replaceAll('&apply_filter=1', "");
            if(filter_get_params != ''){
                state_url += '?';
                state_url += filter_get_params;
                state_url+= 'apply_filter=1'
            }
        }else{
            state_url = url_ajax;
        }
        window.history.pushState({},"", state_url);
        return url_ajax;
    }

    function twwf_change_filter(_this){
        twwf_filter_reset = true;
        let type = _this.data('type');
        if(type === 'price'){
            let twwf_price_slider = _this.closest('form').find('.twwf_price_slider');
            let min_price = parseInt(twwf_price_slider.data('min_price'));
            let max_price = parseInt(twwf_price_slider.data('max_price'));
            let currency = twwf_price_slider.data('currency');
            _this.closest('form').find('.twwf_min_price_input').val(min_price);
            _this.closest('form').find('.twwf_max_price_input').val(max_price);
            twwf_price_slider.slider("values", [min_price, max_price]);
            twwf_price_slider.find('.ui-slider-handle').first().html('<span class="tww_handle_price tww_handle_price_min">'+currency+'<span class="price">'+min_price+'</span></span>');
            twwf_price_slider.find('.ui-slider-handle').last().html('<span class="tww_handle_price tww_handle_price_max">'+currency+'<span class="price">'+max_price+'</span></span>');
            return;
        }
        let value = _this.data('val');
        let name = _this.data('name');

        let input = jQuery('input[name="'+name+'"][value="'+value+'"]');
        let select = jQuery('select[name="'+name+'"]');


        if(input.hasClass('twwf_root_cat')){
            input.closest('.tww_filter_field_block').removeClass('twwf_hide_cat');
            input.closest('.tww_filter_field_block').find('.twwf_hide_cat').removeClass('twwf_hide_cat');
        }

        input.prop('checked',false);
        select.find("option[value='"+value+"']").prop("selected", false)
        select.trigger('change');
    }

    function twwfProductsAjaxFilter(_this) {
        let twwf_main_form = _this.closest('form');
        twwf_form_id = twwf_main_form.data('id');
        twwf_ajax = twwf_main_form.data('ajax');
        if(twwf_ajax != 'yes'){
            return
        }
        let min_price = parseInt(twwf_main_form.find('.twwf_min_price_input').data('min'));
        let max_price = parseInt(twwf_main_form.find('.twwf_max_price_input').data('max'));
        let filtered_min_price = min_price;
        let filtered_max_price = max_price;

        twwf_main_form.find('.twwf_filtered_field').not('.twwf_filtered_field_not_remove').remove();
        let filter_data_array = twwf_main_form.serializeArray();

        let price_title = '-'
        let currency= twwf_main_form.find('.twwf_price_slider').data('currency');
        jQuery(filter_data_array).each(function (index,element){
            let name = element.name;
            let value = element.value;
            if (name.includes('twwf') && name !='twwf_id' && name !='twwf_nonce'){
                let input = jQuery('input[name="'+name+'"][value="'+value+'"]');
                if(name.includes('min')){
                    filtered_min_price = parseInt(input.val());
                    price_title =  currency+filtered_min_price+price_title
                }else if(name.includes('max')){
                    filtered_max_price = parseInt(input.val());
                    price_title = price_title + currency+filtered_max_price
                }
                let select = jQuery('select[name="'+name+'"]');
                let title = ''
                if(input.length>0){
                    title = input.data('title');
                }else if(select.length>0){
                    let option = select.find("option[value='"+value+"']");
                    title = option.data('title');
                }
                if(title != '' && typeof title != "undefined"){
                    twwf_main_form.find('.twwf_filtered_fields').prepend('<span data-type="input" data-name="'+name+'" data-val="'+value+'" class="twwf_filtered_field icon-Close_Icon">'+title+'</span>');
                }
            }
        })
        if (twwf_main_form.find('.twwf_price_slider_container').length>0 && price_title != ''  && (min_price != filtered_min_price || max_price!=filtered_max_price)){
            twwf_main_form.find('.twwf_filtered_fields').prepend('<span data-type="price" class="twwf_filtered_field icon-Close_Icon">'+price_title+'</span>');
        }

        const container = jQuery('.elementor-widget-twbb_woocommerce-products');
        const container_id = jQuery('.elementor-widget-twbb_woocommerce-products').data('id');

        let url = twwf_set_url(twwf_main_form)

        jQuery.ajax({
            url: url,
            type:'GET',
            dataType: 'html',
            success: function(data){
                let parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const new_page = jQuery(doc).find('.elementor-widget-twbb_woocommerce-products[data-id="' + container_id + '"]').html();
                if (typeof new_page == "undefined"){
                    container.html('');
                } else{
                    container.html(new_page);
                }

                jQuery('.twbb_woocommerce-products-ajax-paginate .page-numbers li').on('click', function(e) {
                    e.preventDefault();
                    productsAjaxPagination(jQuery(this));
                })
            }
        })
        if(jQuery('.twwf_filtered_field').length<1){
            jQuery('.twwf_filtered_fields').css({
                'display':'none'
            })
        }else{
            jQuery('.twwf_filtered_fields').css({
                'display':'block'
            })
        }
        twwf_filter_reset = false;

    }

    if(typeof twwf_hide_root_cat !== 'undefined'){
        jQuery(document).on('change', '.tww_filter_form :input', function() {
            twwf_update_cat_fields(this);
        });
        function twwf_update_cat_fields(_this){
            if(!jQuery(_this).is(':checked')){
                return;
            }
            if(!jQuery(_this).hasClass('twwf_root_cat')){
                return;
            }

            let twwf_this_cat_id = jQuery(_this).data('cat_id');
            if(jQuery("input[data-parent_cat_id='"+twwf_this_cat_id+"']").length === 0){
                jQuery(_this).closest('.tww_filter_field_block').addClass('twwf_hide_cat');
                return;
            }
            jQuery(_this).closest('.tww_filter_field_block').find('.twwf_field_option_container').each(function (){
                let sub_cat = jQuery(this).find("input[data-parent_cat_id='"+twwf_this_cat_id+"']");
                if(sub_cat.length === 0){
                    jQuery(this).addClass('twwf_hide_cat');
                }
            });
        }

        jQuery(".tww_filter_form").find("[data-variation='Category']").each(function (){
            twwf_update_cat_fields(this);
        });
    }




});