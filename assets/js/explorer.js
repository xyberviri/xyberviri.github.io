;(function ($) {
  let model = {
      'planets': [],
      'sortedplanets': []
    },
    items,
    colorMappings,
    colorsearch,
    colors,
    $leftNav = $('#left-nav');

  function limiter(fn, wait){
    let isCalled = false,
      calls = [];

    let caller = function(){
      if (calls.length && !isCalled){
        isCalled = true;
        calls.shift().call();
        setTimeout(function(){
          isCalled = false;
          caller();
        }, wait);
      }
    };

    return function(){
      calls.push(fn.bind(this, ...arguments));
      caller();
    };
  }

  function showWaitOverlay() {
    $.LoadingOverlay("show", {
      image       : "",
      fontawesome : "fa fa-spinner fa-spin",
      fontawesomeColor: 'white',
      background: "rgba(0, 0, 0, 0.0)"
    });
  }

  function hideWaitOverlay() {
    $.LoadingOverlay("hide");
  }

  function setCardHandlers() {
    $('.resource-btn').click(function(event) {
      let planet = $(event.currentTarget).closest('.planet');

      let $planetResources = $(planet).find('.planet-resources-card'),
          $planetBlocks = $(planet).find('.planet-blocks-card'),
          id = $(planet).data('id'),
          loaded = $planetResources.attr('data-loaded');

      if (loaded === 'false') {
        fetch('https://api.boundlexx.app/api/v2/worlds/' + id + '/polls/latest/resources/')
          .then(response => response.json())
          .then(json => {
            for (let planet of model.planets) {
              if (planet.id === id) {
                Vue.set(planet, 'resources', json.resources);
                $planetResources.attr('data-loaded', 'true');
                break;
              }
            }
          });
      }

      $planetBlocks.hide();
      $planetResources.show();
    });

    $('.block-btn').click(function(event) {
      let planet = $(event.currentTarget).closest('.planet'),
          $planetResources = $(planet).find('.planet-resources-card'),
          $planetBlocks = $(planet).find('.planet-blocks-card'),
          id = $(planet).data('id'),
          loaded = $planetBlocks.attr('data-loaded');

      if (loaded === 'false') {
        fetch('https://api.boundlexx.app/api/v2/worlds/' + id + '/block-colors/')
          .then(response => response.json())
          .then(json => {
            for (let planet of model.planets) {
              if (planet.id === id) {
                Vue.set(planet, 'block_colors', json);
                $.each(planet.block_colors, function (blockIndex, block) {
                  block.color.color_name = colors[block.item.game_id];
                  block.color.color_hex = colorMappings[block.color.game_id];
                  block.color.color_id = block.color.game_id;

                  for (let i = 0; i < items.length; i++) {
                    if (items[i].value === block.item.game_id) {
                      block.item.title = items[i].label;
                      break;
                    }
                  }
                });
                $planetBlocks.attr('data-loaded', 'true');
                break;
              }
            }
          });
      }

      $planetResources.hide();
      $planetBlocks.show();
    });
  }

  function evaluateFilters() {
    for (const planet of $('.planet')) {
      let typeMatch       = $('#planet-type').val() === 'all'       || $(planet).find('.planet-type').text().toLowerCase() === $('#planet-type').val().toLowerCase();
      let tierMatch       = $('#planet-tier').val() === 'all'       || $(planet).find('.planet-tier').text().toLowerCase() === $('#planet-tier').val().toLowerCase();
      let atmosphereMatch = $('#planet-atmosphere').val() === 'all' || $(planet).find('.planet-atmosphere').text().toLowerCase() === $('#planet-atmosphere').val().toLowerCase();

      if (typeMatch && tierMatch && atmosphereMatch) {
        $(planet).show();
      } else {
        $(planet).hide();
      }
    }

    $('.data-bar .count').text($('.planet:visible').length + ' planets found...');
  }

  $('#planet-type, #planet-tier, #planet-atmosphere, #planet-region').on('change', function(event) {
    evaluateFilters();
  });

  function initializeContent() {
    model.getPlanetType = function (planet) {
      if (planet) {
        let creative = planet.is_creative,
          sovereign = planet.is_sovereign,
          exo = planet.is_exo;

        if (creative) {
          return 'Creative';
        } else if (sovereign) {
          return 'Sovereign';
        } else if (exo) {
          if (planet.hasOwnProperty('end') && moment().isBefore(moment(planet.end))) {
            return 'Active Exo'
          } else {
            return 'Past Exo'
          }
        } else {
          return 'Home';
        }
      } else {
        return '';
      }
    };

    model.getPlanetTier = function (planet) {
      if (planet) {
        return 'T' + (planet.tier + 1);
      } else {
        return '';
      }
    };

    model.getItemTitle = function (gameId) {
      let title = '';

      for (let item of items) {
        if (item.value === gameId) {
          title = item.label;
          break;
        }
      }

      return title;
    };
  }

  function getWorlds(url) {
    fetch(url)
      .then(response => response.json())
      .then(json => {
        if (json.next === null) {
          model.planets = model.planets.concat(json.results);
          $(document).trigger('worlds-ready');
        } else {
          model.planets = model.planets.concat(json.results);
          getWorlds(json.next);
        }
    });
  }

  function finalize() {
    initializeApp();
    hideWaitOverlay();

    setCardHandlers();

    $('.planet').show();

    $('.data-bar .count').text($('.planet:visible').length + ' planets found...');
  }

  function initializeApp() {
    new Vue({
      el: '#planet-explorer',
      data: model
    });

    new Vue({
      el: '#analysis',
      data: model
    });
  }

  function initializeExplorer() {
    $('.data-bar .count').text('Loading content...');
    fetch('assets/js/data/color-mappings.json')
      .then(res => res.json())
      .then(data => {
        colorMappings = data;
        fetch('assets/js/data/colors.json')
          .then(res => res.json())
          .then(data => {
            colors = data;
            fetch('assets/js/data/color-search.json')
              .then(res => res.json())
              .then(data => {
                colorsearch = data;
                fetch('assets/js/data/blocks.json')
                  .then(res => res.json())
                  .then(data => {
                    items = data;
                    $(document).trigger('mappings-ready');
                  })
                  .catch(err => console.error(err));
              });
          })
          .catch(err => console.error(err));
      })
      .catch(err => console.error(err));
  }

  $('#left-nav #close-filter-btn').click(function(event) {
    $leftNav.animate({ 'left': -375 })
  });

  $('#filter-btn').click(function(event) {
    $leftNav.animate({ 'left': 0 });
    $leftNav.find('.filter-section').show();
    $leftNav.find('.search-section').hide();
    $leftNav.find('.sort-section').hide();
  });

  $('#sort-btn').click(function(event) {
    $leftNav.animate({ 'left': 0 });
    $leftNav.find('.filter-section').hide();
    $leftNav.find('.search-section').hide();
    $leftNav.find('.sort-section').show();
  });

  $('#search-btn').click(function(event) {
    $leftNav.animate({ 'left': 0 });
    $leftNav.find('.filter-section').hide();
    $leftNav.find('.sort-section').hide();
    $leftNav.find('.search-section').show();
  });

  $('#sort-type').on('change', function(event) {
    let value = $(event.currentTarget).val();
    if (value === '') {
      //clear
    } else {
      showWaitOverlay();

      let itemId = '';
      for (let item of items) {
        if (item.label === value) {
          itemId = item.value;
          break;
        }
      }

      fetch('https://api.boundlexx.app/api/v2/items/' + itemId + '/resource-counts/?ordering=-percentage')
        .then(response => response.json())
        .then(json => {
          if (json.results) {
            model.sortedplanets = json.results;
            for (let i = model.sortedplanets.length - 1; i >= 0; i--) {
              let worldId = model.sortedplanets[i].world.id;
              $('.planet-grid').prepend($('[data-id="' + worldId + '"]'));
              if (i === 0) {
                hideWaitOverlay();
              }
            }
          } else {
            hideWaitOverlay();
          }
        });
    }
  });

  $(document).on('mappings-ready', function () {
    $('.data-bar .count').text('Retrieving worlds...');

    $('#color-search').autocomplete({
      minLength: 3,
      source: colorsearch,
      focus: function (event, ui) {
        $('#color-search').val(ui.item.label);
        return false;
      },
      select: function( event, ui ) {
        $('#color-search').val(ui.item.label);
        $('#color-search-id').val(ui.item.value);
        return false;
      }
    }).autocomplete( "instance" )._renderItem = function( ul, item ) {
      return $( "<li>" )
        .append( "<div>" + item.label + "</div>" )
        .appendTo( ul );
    };

    $('#block-search').autocomplete({
      minLength: 3,
      source: items,
      focus: function (event, ui) {
        $('#block-search').val(ui.item.label);
        return false;
      },
      select: function( event, ui ) {
        $('#block-search').val(ui.item.label);
        $('#block-search-id').val(ui.item.value);
        return false;
      }
    }).autocomplete( "instance" )._renderItem = function( ul, item ) {
      return $( "<li>" )
        .append( "<div>" + item.label + "</div>" )
        .appendTo( ul );
    };

    getWorlds('https://api.boundlexx.app/api/v2/worlds/?limit=750&show_inactive=true');
  });

  $(document).on('worlds-ready', function () {
    $('.data-bar .count').text('Rendering world grid...');
    finalize();
  });

  function getWorldData(json, planet) {
    fetch('https://api.boundlexx.app/api/v2/worlds/' + planet.world.id + '/')
      .then(worldResponse => worldResponse.json())
      .then(worldJson => {
        model.planets.push(worldJson);
        $('.planet').show();
        $('.data-bar .count').text($('.planet:visible').length + ' planets found...');
        setCardHandlers();
        hideWaitOverlay();
      });
  }

  $('#color-item-search-btn').click(function(event) {
    let blockId = $('#block-search-id').val(),
        colorId = $('#color-search-id').val();

    if (blockId !== '' && colorId !== '') {
      showWaitOverlay();
      fetch('https://api.boundlexx.app/api/v2/colors/' + colorId + '/blocks/' + blockId + '/?limit=999')
        .then(response => response.json())
        .then(json => {
          Vue.set(model, 'planets', []);
          const limited = limiter((json, planet) => getWorldData(json, planet), 225);

          if (json.results.length === 0) {
            $('.planet').show();
            $('.data-bar .count').text($('.planet:visible').length + ' planets found...');
            hideWaitOverlay();
          }

          for (let planet of json.results) {
            limited(json, planet);
          }
        });
    }
  });

  $('#watcher-btn').click(function(event) {
    $('.watcher-bg').show();
    $('#close-watcher-btn').click(function(event) {
      $('.watcher-bg').hide();
      $('body').removeClass('noscroll');
      $('.planet-grid').removeClass('noscroll');
    });

    $('#watcher #block-type').on('change', function(event) {
      showWaitOverlay();

      let value = $(event.currentTarget).val();
      if (value !== '') {
        $.ajax({
          url: 'https://api.boundlexx.app/api/v2/items/' + value + '/sovereign-colors/?limit=255',
          dataType: 'json',
          success: function(response) {
            $('body').addClass('noscroll');
            $('.planet-grid').addClass('noscroll');
            $('.watcher-colors').empty();
            for (const color of response.results) {
              $('.watcher-colors').append('<div class="watcher-color-name">' +
                colors[color.color.game_id] + ' (' + color.color.game_id + ')' +
                '</div>' +
                '<div class="watcher-color-hex">' +
                colorMappings[color.color.game_id] +
                '</div>');
              $('.watcher-color-hex:last-of-type').css('background-color', colorMappings[color.color.game_id]);
            }

            hideWaitOverlay();
          },
          error: function() {
            console.log('Failed to retrieve block colors');
            hideWaitOverlay();
          }
        })
      }
    });
  });

  $('#exploration-btn').click(function() {
    $('#analysis').hide();
    $('#analysis-btns').hide();
    $('#explorer-btns').show();
    $('#planet-explorer').show();
  });

  $('#analysis-btn').click(function() {
    $('#planet-explorer').hide();
    $('#explorer-btns').hide();
    $('#analysis-btns').show();
    $('#analysis').show();
  });

  showWaitOverlay();
  initializeContent();
  initializeExplorer();

})(jQuery);
