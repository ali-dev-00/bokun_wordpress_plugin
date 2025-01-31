jQuery(document).ready(function ($) {
  const container = $("#bokun_exp_container");
  const $dateRangeInput = $('input[name="daterange"]');
  const $selectedDates = $(".custom-bokun-selected-dates");
  const $productCount = $("#custom-bokun-product-count");
  // Set default values if not already stored
  if (!localStorage.getItem('language')) {
    localStorage.setItem('language', bokunAjax.defaultLanguage); // Default from PHP
  }
  if (!localStorage.getItem('currency')) {
    localStorage.setItem('currency', bokunAjax.defaultCurrency); // Default from PHP
  }
  // Helper function for AJAX calls
  window.performAjax = function (action, additionalData, beforeSendCallback, successCallback, errorCallback) {
    // Retrieve language and currency
    const language = localStorage.getItem('language');
    const currency = localStorage.getItem('currency');
    // Combine stored values with additional data
    var data = {
      action: action,
      lang: language,
      currency: currency,
      ...additionalData
    };
    // Perform the AJAX call
    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: data,
      beforeSend: beforeSendCallback,
      success: successCallback,
      error: errorCallback,
    });
  }
  // Fetch experiences by product
  $(document).on("click", ".custom-bokun-view-list", function () {
    const productId = $(this).data("product-id");
    if (!productId) {
      console.log("No product ID found.");
      return;
    }
    performAjax(
      "fetch_experiences_by_product",
      { product_id: productId },
      () => container.html('<div class="loading" style="text-align:center;">Loading...</div>'),
      (response) => {
        if (response.success) {
          container.html(response.data);
          updateCardCount();
          fetchExperiencePrices();
          // Scroll to the top of the container after loading content
          $("html, body").animate({ scrollTop: container.offset().top - 20 }, "slow");
        } else {
          container.html(`<p>${response.data}</p>`);
        }
      },
      () => container.html("<p>An error occurred while fetching experiences.</p>")
    );
  });
  // Reload default experiences
  $(document).on("click", "#custom-bokun-back-btn", function () {
    performAjax(
      "fetch_experiences_by_product",
      {},
      () => container.html('<div class="loading" style="text-align:center;">Reloading experiences...</div>'),
      (response) => {
        if (response.success) {
          container.html(response.data);
          updateCardCount();
          fetchExperiencePrices();
        } else {
          container.html(`<p>${response.data}</p>`);
        }
      },
      () => container.html("<p>Unable to reload experiences.</p>")
    );
  });
  // Update the visible card count
  function updateCardCount() {
    const visibleCards = $(".custom-bokun-card:visible").length;
    $productCount.text(visibleCards);
  }
  // Date range picker initialization
  const today = moment().format("YYYY-MM-DD");
  $dateRangeInput.daterangepicker(
    {
      opens: "left",
      autoUpdateInput: false,
      minDate: today,
      locale: { format: "YYYY-MM-DD", cancelLabel: "Clear" },
    },
    function (start, end) {
      const startDate = start.format("YYYY-MM-DD");
      const endDate = end.format("YYYY-MM-DD");
      console.log('TEST');
      console.log(startDate);
      console.log(endDate);
      $dateRangeInput.attr('data-start-date', startDate);
      $dateRangeInput.attr('data-end-date', endDate);
      $dateRangeInput.val(`${startDate} - ${endDate}`);
      $("#start-date").text(startDate);
      $("#end-date").text(endDate);
      $dateRangeInput.trigger("input");
      updateCardCount();
      $selectedDates.show();
    }
  );
  // Clear selected dates
  $dateRangeInput.on("cancel.daterangepicker", function () {
    resetDateInputs();
  });
  $("#clear-start").on("click", function () {
    clearSingleDate("#start-date", "start");
  });
  $("#clear-end").on("click", function () {
    clearSingleDate("#end-date", "end");
  });
  function clearSingleDate(selector, type) {
    const otherSelector = type === "start" ? "#end-date" : "#start-date";
    const otherDate = $(otherSelector).text();
    $(selector).text("Not Specified");
    if (otherDate === "Not Specified") {
      $dateRangeInput.val("");
    } else {
      $dateRangeInput.val(type === "start" ? `Not Specified - ${otherDate}` : `${otherDate} - Not Specified`);
    }
    hideSelectedDatesIfEmpty();
    updateCardCount();
  }
  function resetDateInputs() {
    $dateRangeInput.val("").attr("placeholder", "When are you going?");
    $dateRangeInput.attr('data-start-date', '');
    $dateRangeInput.attr('data-end-date', '');
    $("#start-date, #end-date").text("Not Specified");
    $selectedDates.hide();
    updateCardCount();
  }
  function hideSelectedDatesIfEmpty() {
    if ($("#start-date").text() === "Not Specified" && $("#end-date").text() === "Not Specified") {
      resetDateInputs();
    }
  }
  // Search bar functionality
  $("#search-bar").on("input", function () {
    const query = $(this).val().toLowerCase();
    $(".custom-bokun-card").each(function () {
      const title = $(this).data("title");
      $(this).toggle(title.includes(query));
    });
    updateCardCount();
  });
  // Perform a search via AJAX
  let typingTimer; // Timer identifier
  const typingDelay = 500; // Delay in milliseconds (adjust as needed)
  $("#search-bar,#date-range").on("input", function () {
    const searchQuery = $('#search-bar').val();
    var start_date   = $("#date-range").attr('data-start-date');
    var end_date     = $("#date-range").attr('data-end-date');
    // Clear the previous timer
    clearTimeout(typingTimer);
    // Start a new timer
    typingTimer = setTimeout(() => {
      performAjax(
        "fetch_experiences_by_date",
        { 
          search_query: searchQuery,
          startDate:start_date,
          endDate:end_date
        },
        () => container.html('<div class="loading activity-loading-full-block">  Searching...</div>'),
        (response) => {
          if (response.success) {
            container.html(response.data);
            updateCardCount();
            fetchExperiencePrices();
          } else {
            container.html(`<p>${response.data}</p>`);
          }
        },
        () => container.html("<p>An error occurred while performing the search.</p>")
      );
    }, typingDelay);
  });
});
jQuery(document).ready(function ($) {
  const container = $("#bokun_exp_container");
  const $dateRangeInput = $('input[name="daterange"]');
  const $selectedDates = $(".custom-bokun-selected-dates");
  const $productCount = $("#custom-bokun-product-count");
  // Set default values if not already stored
  if (!localStorage.getItem('language')) {
    localStorage.setItem('language', bokunAjax.defaultLanguage); // Default from PHP
  }
  if (!localStorage.getItem('currency')) {
    localStorage.setItem('currency', bokunAjax.defaultCurrency); // Default from PHP
  }
  // Helper function for AJAX calls
  window.performAjax = function (action, additionalData, beforeSendCallback, successCallback, errorCallback) {
    // Retrieve language and currency
    const language = localStorage.getItem('language');
    const currency = localStorage.getItem('currency');
    // Combine stored values with additional data
    var data = {
      action: action,
      lang: language,
      currency: currency,
      ...additionalData
    };
    // Perform the AJAX call
    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: data,
      beforeSend: beforeSendCallback,
      success: successCallback,
      error: errorCallback,
    });
  }
  // Fetch experiences by product
  $(document).on("click", ".custom-bokun-view-list", function () {
    const productId = $(this).data("product-id");
    if (!productId) {
      console.log("No product ID found.");
      return;
    }
    performAjax(
      "fetch_experiences_by_product",
      { product_id: productId },
      () => container.html('<div class="loading" style="text-align:center;">Loading...</div>'),
      (response) => {
        if (response.success) {
          container.html(response.data);
          updateCardCount();
          fetchExperiencePrices();
          // Scroll to the top of the container after loading content
          $("html, body").animate({ scrollTop: container.offset().top - 20 }, "slow");
        } else {
          container.html(`<p>${response.data}</p>`);
        }
      },
      () => container.html("<p>An error occurred while fetching experiences.</p>")
    );
  });
  // Reload default experiences
  $(document).on("click", "#custom-bokun-back-btn", function () {
    performAjax(
      "fetch_experiences_by_product",
      {},
      () => container.html('<div class="loading" style="text-align:center;">Reloading experiences...</div>'),
      (response) => {
        if (response.success) {
          container.html(response.data);
          updateCardCount();
          fetchExperiencePrices();
        } else {
          container.html(`<p>${response.data}</p>`);
        }
      },
      () => container.html("<p>Unable to reload experiences.</p>")
    );
  });
  // Update the visible card count
  function updateCardCount() {
    const visibleCards = $(".custom-bokun-card:visible").length;
    $productCount.text(visibleCards);
  }
  // Date range picker initialization
  const today = moment().format("YYYY-MM-DD");
  $dateRangeInput.daterangepicker(
    {
      opens: "left",
      autoUpdateInput: false,
      minDate: today,
      locale: { format: "YYYY-MM-DD", cancelLabel: "Clear" },
    },
    function (start, end) {
      const startDate = start.format("YYYY-MM-DD");
      const endDate = end.format("YYYY-MM-DD");
      console.log('TEST');
      console.log(startDate);
      console.log(endDate);
      $dateRangeInput.attr('data-start-date', startDate);
      $dateRangeInput.attr('data-end-date', endDate);
      $dateRangeInput.val(`${startDate} - ${endDate}`);
      $("#start-date").text(startDate);
      $("#end-date").text(endDate);
      $dateRangeInput.trigger("input");
      updateCardCount();
      $selectedDates.show();
    }
  );
  // Clear selected dates
  $dateRangeInput.on("cancel.daterangepicker", function () {
    resetDateInputs();
  });
  $("#clear-start").on("click", function () {
    clearSingleDate("#start-date", "start");
  });
  $("#clear-end").on("click", function () {
    clearSingleDate("#end-date", "end");
  });
  function clearSingleDate(selector, type) {
    const otherSelector = type === "start" ? "#end-date" : "#start-date";
    const otherDate = $(otherSelector).text();
    $(selector).text("Not Specified");
    if (otherDate === "Not Specified") {
      $dateRangeInput.val("");
    } else {
      $dateRangeInput.val(type === "start" ? `Not Specified - ${otherDate}` : `${otherDate} - Not Specified`);
    }
    hideSelectedDatesIfEmpty();
    updateCardCount();
  }
  function resetDateInputs() {
    $dateRangeInput.val("").attr("placeholder", "When are you going?");
    $dateRangeInput.attr('data-start-date', '');
    $dateRangeInput.attr('data-end-date', '');
    $("#start-date, #end-date").text("Not Specified");
    $selectedDates.hide();
    updateCardCount();
  }
  function hideSelectedDatesIfEmpty() {
    if ($("#start-date").text() === "Not Specified" && $("#end-date").text() === "Not Specified") {
      resetDateInputs();
    }
  }
  // Search bar functionality
  $("#search-bar").on("input", function () {
    const query = $(this).val().toLowerCase();
    $(".custom-bokun-card").each(function () {
      const title = $(this).data("title");
      $(this).toggle(title.includes(query));
    });
    updateCardCount();
  });
  // Perform a search via AJAX
  let typingTimer; // Timer identifier
  const typingDelay = 500; // Delay in milliseconds (adjust as needed)
  $("#search-bar,#date-range").on("input", function () {
    const searchQuery = $('#search-bar').val();
    var start_date   = $("#date-range").attr('data-start-date');
    var end_date     = $("#date-range").attr('data-end-date');
    // Clear the previous timer
    clearTimeout(typingTimer);
    // Start a new timer
    typingTimer = setTimeout(() => {
      performAjax(
        "fetch_experiences_by_date",
        { 
          search_query: searchQuery,
          startDate:start_date,
          endDate:end_date
        },
        () => container.html('<div class="loading activity-loading-full-block">  Searching...</div>'),
        (response) => {
          if (response.success) {
            container.html(response.data);
            updateCardCount();
            fetchExperiencePrices();
          } else {
            container.html(`<p>${response.data}</p>`);
          }
        },
        () => container.html("<p>An error occurred while performing the search.</p>")
      );
    }, typingDelay);
  });
});
