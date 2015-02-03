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

  var variant, divs, parent, index = 0;
  var selection = [];
  var buttons;


  function init() {
    divs = $('#product-variants .variant-options');
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
    var tmp = $('select.Size').val();
    var opt = $('select.Size').find('option[value="'+tmp+'"]');
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

  function find_variant() {
    var selected = divs.find('.selected');
    var variants = get_variant_objects($(selected.get(0)).data('rel'));
    if (selected.length == divs.length) {
      return variant = variants[selection[0]];
    } else {
      var prices = [];
      $.each(variants, function(key, value) { prices.push(value.price) });
      prices = $.unique(prices).sort(function(a, b) {
        return to_f(a) < to_f(b) ? -1 : 1;
      });
      if (prices.length == 1) {
        $('#product-price .price').html('<span class="price assumed">' + prices[0] + '</span>');
      } else {
        $('#product-price .price').html('<span class="price from">' + prices[0] + '</span> - <span class="price to">' + prices[prices.length - 1] + '</span>');
      }
      return false;
    }
  }

  function toggle() {
    if (variant) {
      $('#variant_id, form[data-form-type="variant"] input[name$="[variant_id]"]').val(variant.id);
      $('#product-price .price').removeClass('unselected').text(variant.price);
      if (variant.count > 0 || allow_backorders)
        $('#cart-form button[type=submit]').attr('disabled', false).fadeTo(100, 1);
      $('form[data-form-type="variant"] button[type=submit]').attr('disabled', false).fadeTo(100, 1);
      try {
        show_variant_images(variant.id);
      } catch(error) {
        // depends on modified version of product.js
      }
    } else {
      $('#variant_id, form[data-form-type="variant"] input[name$="[variant_id]"]').val('');
      $('#cart-form button[type=submit], form[data-form-type="variant"] button[type=submit]').attr('disabled', true).fadeTo(0, 0.5);
      price = $('#product-price .price').addClass('unselected')
      // Replace product price by "(select)" only when there are at least 1 variant not out-of-stock
      variants = $("div.variant-options.index-0")
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


  // function handle_clear(evt) {
  //   evt.preventDefault();
  //   clear(get_index(this));
  // }

  function handle_size_change(evt) {
    variant = null;
    selection = [];
    var a = $(this);
    a = a.find('option[value="'+a.val()+'"]')
    if (!parent.has(a).length) {
      clear_size(divs.index(a.parents('.variant-options:first')));
    }
    disable(buttons);
    if (a.val() != "Select one") {
      var a = enable_size(a.addClass('selected'));
    }8
    advance();
    if (find_variant()) {
      toggle();
    }
  }

  function handle_color_change(evt) {
    evt.preventDefault();
    variant = null;
    selection = [];
    var a = $(this);
    if (!parent.has(a).length) {
      clear_color(divs.index(a.parents('.variant-options:first')));
    }
    disable(buttons);
    var a = enable_color(a.addClass('selected'));
    advance();
    if (find_variant()) {
      toggle();
    }
  }

  $(document).ready(init);

};
