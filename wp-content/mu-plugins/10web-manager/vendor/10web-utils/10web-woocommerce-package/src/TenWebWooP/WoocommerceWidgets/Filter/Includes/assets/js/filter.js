jQuery(document).ready(function() {
    jQuery('.twwf_field_header').click(function (){
        let twwf_open_close_field = jQuery(this).find('.twwf_open_close_field');
        let field_id = twwf_open_close_field.data('field_id');
        let field = jQuery('#'+field_id);
        if(twwf_open_close_field.hasClass('twwf_close')){
            twwf_open_close_field.removeClass('twwf_close');
            field.removeClass('twwf_hide_field');
        }else{
            twwf_open_close_field.addClass('twwf_close');
            field.addClass('twwf_hide_field');
        }
        twwf_calculate_form_height();
    });
    jQuery('.twwf_expand_collapse_filter').click(function (){
        let type = jQuery(this).data('type');
        if(type === 'collapsed'){
            jQuery(this).html(jQuery(this).data('title-expand'));
            jQuery(this).data('type', 'expanded');
            jQuery(this).addClass('twwf_expand_filter');
            jQuery(this).addClass('icon-Plus_Icon');
            jQuery(this).removeClass('twwf_collapse_filter');
            jQuery(this).removeClass('icon-Minus_Ico');
            jQuery('.twwf_filter_field').addClass('twwf_hide_field');
            jQuery('.twwf_open_close_field').addClass('twwf_close');
            jQuery(this).closest('form').addClass('twwf_form_expand');
        }else if(type === 'expanded'){
            jQuery(this).html(jQuery(this).data('title-collapsed'));
            jQuery(this).data('type', 'collapsed');
            jQuery('.twwf_filter_field').removeClass('twwf_hide_field');
            jQuery(this).addClass('twwf_collapse_filter');
            jQuery(this).addClass('icon-Minus_Icon');
            jQuery(this).removeClass('twwf_expand_filter');
            jQuery(this).removeClass('icon-Plus_Icon');
            jQuery('.twwf_open_close_field').removeClass('twwf_close');
            jQuery(this).closest('form').removeClass('twwf_form_expand')
        }
        twwf_calculate_form_height();
    });
    jQuery('.twwf_filter_color_block .tww_color_name').click(function (){
        let twwf_color_input = jQuery(this).closest('.twwf_filter_color_block').find('.twwf_color_checkbox');
        if(twwf_color_input.prop('checked')) {
            twwf_color_input.prop('checked', false);
        }else{
            twwf_color_input.prop('checked', true);
        }
        twwf_color_input.trigger('change');
    });
});