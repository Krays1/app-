(function ($) {
  "use strict";

  /* on scroll count */
  var a = 0;
  $(window).scroll(function () {
    var oTop = $('#counter').offset().top - window.innerHeight;
    if (a == 0 && $(window).scrollTop() > oTop) {
      $('.counter-value').each(function () {
        var $this = $(this),
          countTo = $this.attr('data-count');
        $(this).prop('Counter', 0).animate({
          Counter: countTo
        }, {
          duration: 2000,
          easing: 'swing',
          step: function (now) {
            $this.text(Math.floor(now));
          },
          complete: function () {
            $this.text(countTo);
          }
        });
      });
      a = 1;
    }
  });

  /* Button hover effect */
  document.querySelectorAll('.button').forEach(button => {
    button.onmousemove = function (e) {
      var rect = e.target.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      e.target.style.setProperty('--x', x + 'px');
      e.target.style.setProperty('--y', y + 'px');
    };
  });

  var initPreloader = function () {
    $('body').addClass('preloader-site');
    $(window).on('load', function () {
      setTimeout(function () {
        $('.preloader').fadeOut('slow', function () {
          $(this).remove();
          $('body').removeClass('preloader-site');
        });
      }, 500);
    });
  };

  $(document).ready(function () {
    initPreloader();

    // Isotope Initialization
    var $container = $('.isotope-container');
    if ($container.length) {
      $container.isotope({
        itemSelector: '.item',
        layoutMode: 'masonry'
      });
    }

    // Chocolat Lightbox Init
    if ($('.image-link').length) {
      Chocolat(document.querySelectorAll('.image-link'), {
        imageSize: 'contain',
        loop: true,
      });
    }

    // Search Popup
    $('#header-nav').on('click', '.search-button', function () {
      $('.search-popup').toggleClass('is-visible');
    });
    $('#header-nav').on('click', '.btn-close-search', function () {
      $('.search-popup').toggleClass('is-visible');
    });
    $(document).keyup(function (e) {
      if (e.which === 27) $('.search-popup').removeClass('is-visible');
    });

    // Animate On Scroll (AOS) Init
    AOS.init({
      duration: 2000,
      once: true,
    });

    // Swiper Slider Init
    if ($('.testimonial-swiper').length) {
      new Swiper('.testimonial-swiper', {
        slidesPerView: 1,
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.main-slider-button-next', prevEl: '.main-slider-button-prev' },
      });
    }

    // Filter Buttons Active State & Filtering
    $('.filter-button').click(function () {
      $('.filter-button').removeClass('active');
      $(this).addClass('active');

      var filterValue = $(this).attr('data-filter');
      $container.isotope({ filter: filterValue === '*' ? '*' : filterValue });

      // Reinitialize AOS after filtering
      AOS.refresh();
    });

  });

})(jQuery);