$.extend({
  keys: function(obj){
    var a = [];
    $.each(obj, function(k){ a.push(k) });
    return a;
  }
});

if (!Array.indexOf) Array.prototype.indexOf = function(obj) {
  for(var i = 0; i < this.length; i++){
    if(this[i] == obj) {
      return i;
    }
  }
  return -1;
}

if (!Array.find_matches) Array.find_matches = function(a) {
  var i, m = [];
  a = a.sort();
  i = a.length
  while(i--) {
    if (a[i - 1] == a[i]) {
      m.push(a[i]);
    }
  }
  if (m.length == 0) {
    return false;
  }
  return m;
}

function VariantOptions(params) {

  var options = params['options'];
  var allow_backorders = !params['track_inventory_levels'] ||  params['allow_backorders'];
  var allow_select_outofstock = params['allow_select_outofstock'];
  var default_instock = params['default_instock'];
  var wrapper = params['wrapper'];

  var variant, divs, parent, index = 0;
  var selection = [];
  var buttons;


  init = function() {
    divs = $(wrapper).find('#product-variants .variant-options');
    //Enable Colors
    update();
    enable_size(parent.find('select.Size'));
    //Enable Sizes
    enable_color(parent.find('.colors'));
    //Enable Colors
    enable_size(parent.find('select.Size'));
    //Enable Sizes
    enable_color(parent.find('.color'));
    toggle();

    if (default_instock) {
      divs.each(function(){
        $(this).find(".variant-option-values .in-stock:first").click();
      });
    }
  }

  function get_index(parent) {
    return parseInt($(parent).attr('class').replace(/[^\d]/g, ''));
  }

  function update(i) {
    index = isNaN(i) ? index : i;
    parent = $(divs.get(index));
    buttons = parent.find('.option-value');
  }

  function disable(btns) {
    return btns.removeClass('selected');
  }

  function enable_size(btns) {
    bt = btns.not('.unavailable').removeClass('locked').unbind('click')
    if (!allow_select_outofstock && !allow_backorders)
      bt = bt.filter('.in-stock')
    return bt.change(handle_size_change).filter('.auto-click').removeClass('auto-click').click();
  }

  function enable_color(btns) {
    bt = btns.not('.unavailable').removeClass('locked').unbind('click')
    if (!allow_select_outofstock && !allow_backorders)
      bt = bt.filter('.in-stock')
    return bt.click(handle_color_change).filter('.auto-click').removeClass('auto-click').click();
  }

  function advance() {
    index++
    update();
    inventory(buttons.removeClass('locked'));
    enable_size(buttons);
    enable_color(buttons);
  }

  function inventory(btns) {
    var keys, variants, count = 0, selected = {};
    var sels = [];
    // var sels = $.map(divs.find('.selected'), function(i) { 
    //   return $(i).data('rel') 
    // });
    //Grab selected Size
    var tmp = $(wrapper).find('select.Size').val();
    var opt = $(wrapper).find('select.Size').find('option[value="'+tmp+'"]');
    sels.push(opt.data('rel'));
    //Grab selected color

    $.each(sels, function(key, value) {
      key = value.split('-');
      var v = options[key[0]][key[1]];
      keys = $.keys(v);
      var m = Array.find_matches(selection.concat(keys));
      if (selection.length == 0) {
        selection = keys;
      } else if (m) {
        selection = m;
      }
    });
    btns.removeClass('in-stock out-of-stock unavailable').each(function(i, element) {
      variants = get_variant_objects($(element).data('rel'));
      keys = $.keys(variants);
      if (keys.length == 0) {
        disable($(element).addClass('unavailable locked').unbind('click'));
      } else if (keys.length == 1) {
        _var = variants[keys[0]];
        $(element).addClass((allow_backorders || _var.count) ? selection.length == 1 ? 'in-stock auto-click' : 'in-stock' : 'out-of-stock');
      } else if (allow_backorders) {
        $(element).addClass('in-stock');
      } else {
        $.each(variants, function(key, value) { count += value.count });
        $(element).addClass(count ? 'in-stock' : 'out-of-stock');
      }
    });
  }

  function get_variant_objects(rels) {
    var i, ids, obj, variants = {};
    if (typeof(rels) == 'string') { rels = [rels]; }
    var otid, ovid, opt, opv;
    i = rels.length;
    try {
      while (i--) {
        ids = rels[i].split('-');
        otid = ids[0];
        ovid = ids[1];
        opt = options[otid];
        if (opt) {
          opv = opt[ovid];
          ids = $.keys(opv);
          if (opv && ids.length) {
            var j = ids.length;
            while (j--) {
              obj = opv[ids[j]];
              if (obj && $.keys(obj).length && 0 <= selection.indexOf(obj.id.toString())) {
                variants[obj.id] = obj;
              }
            }
          }
        }
      }
    } catch(error) {
      //console.log(error);
    }
    return variants;
  }

  function to_f(string) {
    return parseFloat(string.replace(/[^\d\.]/g, ''));
  }

  function find_variant(selected_option) {
    var selected = divs.find('.selected').not('li, select');
    var variants = get_variant_objects(selected_option.data('rel'));
    if (selected.length == divs.length) {
      if (count_variants(variants) == 1) {
        return variant = variants[first_variant_key(variants)];
      } else {
        return variant = variants[selection[0]];
      }
    } else {
      var prices = [];
      $.each(variants, function(key, value) { prices.push(value.price) });
      prices = $.unique(prices).sort(function(a, b) {
        return to_f(a) < to_f(b) ? -1 : 1;
      });
      if (prices.length == 1) {
        $(wrapper).find('#product-price .price').html('<span class="price assumed">' + prices[0] + '</span>');
      } else {
        $(wrapper).find('#product-price .price').html('<span class="price from">' + prices[0] + '</span> - <span class="price to">' + prices[prices.length - 1] + '</span>');
      }
      return false;
    }
  }

  function count_variants(variants) {
    count = 0;
    for (key in variants) {
      count++;
    }
    return count;
  }

  function first_variant_key(variants) {
    for (key in variants) {
      return key;
    }
  }

  function toggle() {
    if (variant) {
      $(wrapper).find('#variant_id, form[data-form-type="variant"] input[name$="[variant_id]"]').val(variant.id);
      $(wrapper).find('#product-price .price').removeClass('unselected').text(variant.price);
      if (variant.count > 0 || allow_backorders)
        $(wrapper).find('#cart-form button[type=submit]').attr('disabled', false).fadeTo(100, 1);
      $(wrapper).find('form[data-form-type="variant"] button[type=submit]').attr('disabled', false).fadeTo(100, 1);
      try {
        show_variant_images(variant.id);
      } catch(error) {
        // depends on modified version of product.js
      }
    } else {
      $(wrapper).find('#variant_id, form[data-form-type="variant"] input[name$="[variant_id]"]').val('');
      $(wrapper).find('#cart-form button[type=submit], form[data-form-type="variant"] button[type=submit]').attr('disabled', true).fadeTo(0, 0.5);
      price = $(wrapper).find('#product-price .price').addClass('unselected')
      // Replace product price by "(select)" only when there are at least 1 variant not out-of-stock
      variants = $(wrapper).find("div.variant-options.index-0")
      if (variants.find(".option-value.out-of-stock").length != variants.find(".option-value").length)
        price.text('(select)');
    }
  }

  function clear_size(i) {
    variant = null;
    update(i);
    enable_size(buttons.removeClass('selected'));
    toggle();
    parent.nextAll().each(function(index, element) {
      disable($(element).find('.option-value').show().removeClass('in-stock out-of-stock').addClass('locked').unbind('click'));
    });
    show_all_variant_images();
  }

  function clear_color(i) {
    variant = null;
    update(i);
    enable_color(buttons.removeClass('selected'));
    toggle();
    parent.nextAll().each(function(index, element) {
      disable($(element).find('.option-value').show().removeClass('in-stock out-of-stock').addClass('locked').unbind('click'));
    });
    show_all_variant_images();
  }

  function handle_size_change(evt) {
    variant = null;
    selection = [];
    var a = $(this);
    a = a.find('option[value="'+a.val()+'"]')
    selected_option = a
    if (!parent.has(a).length) {
      clear_size(divs.index(a.parents('.variant-options:first')));
    }
    disable(buttons);
    if (a.val() != "Select one" && !a.is('li')) {
      var a = enable_size(a.addClass('selected'));
    }
    advance();
    if (find_variant(selected_option)) {
      toggle();
    }
  }

  function handle_color_change(evt) {
    if ($(evt.target).hasClass('out-of-stock')){
      return;
    }
    evt.preventDefault();
    variant = null;
    selection = [];
    var a = $(this);
    if (!parent.has(a).length) {
      clear_color(divs.index(a.parents('.variant-options:first')));
    }
    disable(buttons);
    if (a.val() != "Select one" && !a.is('li')) {
      var a = enable_size(a.addClass('selected'));
    }
    advance();
    if (find_variant($(this))) {
      toggle();
    }
  }

  $(document).ready(init);
  $(document).on('page:load', init);
  $(document).on('page:change', init);

};
