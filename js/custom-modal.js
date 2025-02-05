var ActivityJson;
var selected_availability_data;
var triggerApiCallResponse;
var selectedPricingCategoriesCount = {};
var pricingCategoryprices = {};
var available_dates = [];
var available_time_slots = [];
var pricingCategoryTotalCount = 0;
jQuery(document).ready(function ($) {
  if (!$("#modal").length) {
    $("body").append(`<div class="custom-bokun-modal" id="modal"></div>`);
  }
  $(window).on("load", async function () {
    // Get experienceId from the URL query string
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("act")) {
      var experienceId = urlParams.get("act");
      // Call the function with experienceId
      await fetchActivityDetails(experienceId);
    }
  });
  $(document).on("click", ".open-direct-link", function () {
    var url = $(this).data("url");
    if (url) {
      window.open(url, "_blank");
    }
  });
  $(document).on("change", ".currency-dropdown", function () {
    var currency = $(`select.currency-dropdown option:selected`).val();
    localStorage.setItem("currency", currency);
    var activityId = parseInt($("#modal").data("id")) || 0;
    if (activityId) {
      $(`.custom-bokun-card[data-experience-id=${activityId}]`).trigger(
        "click"
      );
    }
  });
  $(document).on("click", ".custom-bokun-card", async function (event) {
    // Check if the target element has the class 'fa-external-link'
    if ($(event.target).hasClass("fa-external-link")) {
      event.preventDefault(); // Prevent the click event from being triggered
      return; // Exit the function early
    }
    const experienceId = $(this).data("experience-id"); // Get the experience ID
    await fetchActivityDetails(experienceId);
  });
  async function fetchActivityDetails(experienceId) {
    // Retrieve language and currency from localStorage
    var language = localStorage.getItem("language");
    var currency = localStorage.getItem("currency");
    // console.log("Experience ID:", experienceId);
    if (!experienceId) {
      alert("Experience ID is missing.");
      return;
    }
    // API call to fetch experience details
    // ActivityJson
    await $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: {
        action: "fetch_experience_details",
        language: language,
        currency: currency,
        experience_id: experienceId,
        json_only: true,
      },
      beforeSend: function () {
        // console.log('Now Fetching Activity Json');
        ActivityJson = null;
      },
      success: function (response) {
        if (response.success) {
          ActivityJson = response.data;
        }
      },
      error: function () {
        // console.log('Error Fetching Activity Json');
        ActivityJson = null;
      },
    });
    await $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: {
        action: "fetch_experience_details",
        language: language,
        currency: currency,
        experience_id: experienceId,
      },
      beforeSend: function () {
        $("body").append('<div class="loading-overlay">Loading...</div>');
      },
      success: function (response) {
        $(".loading-overlay").remove(); // Remove loading overlay
        if (response.success) {
          $("#modal").html(response.data);
          // Show the modal
          const modal = document.getElementById("modal");
          if (modal) {
            $(`select.currency-dropdown`).val(currency);
            modal.style.display = "flex";
            $("#modal").attr("data-id", experienceId);
            $("select.custom-bokun-dropdown.language-dropdown").on(
              "change",
              function () {
                var lang = $(this).val();
                localStorage.setItem("language", lang);
                var expId = $("#modal").attr("data-id");
                $(`.custom-bokun-card[data-experience-id=${expId}]`).trigger(
                  "click"
                );
              }
            );
            /**************************
             * SHOW/HIDE FUNCTIONALITY
             **************************/
            jQuery(".custom-bokun-modal-content").on(
              "click",
              "#custom_bokun_gallery_btn",
              function () {
                if (
                  jQuery(".custom-bokun-modal-content").length &&
                  jQuery("#img-gallery-container").length
                ) {
                  jQuery(".custom-bokun-modal-content").hide(); // Hide modal content
                  jQuery("#img-gallery-container").show(); // Show gallery container
                  initializeCarousel(jQuery);
                }
              }
            );
            jQuery("#img-gallery-container").on(
              "click",
              "#custom-gallery-back-btn",
              function () {
                if (
                  jQuery("#img-gallery-container").length &&
                  jQuery(".custom-bokun-modal-content").length
                ) {
                  jQuery("#img-gallery-container").hide(); // Hide gallery container
                  jQuery(".custom-bokun-modal-content").show(); // Show modal content
                }
              }
            );
            // Add modal-specific event handlers
            attachModalEventListeners(modal);
            // google map instances on meeting points places
            const mapElements = document.querySelectorAll(".map");
            mapElements.forEach((mapElement) => {
              const { latitude, longitude, zoom, title } = mapElement.dataset;
              // Initialize the map
              const map = new google.maps.Map(mapElement, {
                center: {
                  lat: parseFloat(latitude),
                  lng: parseFloat(longitude),
                },
                zoom: parseInt(zoom),
                fullscreenControl: false, // Disable fullscreen control
                mapTypeId: google.maps.MapTypeId.TERRAIN, // Set map type to terrain
              });
              // Add a marker
              const marker = new google.maps.Marker({
                position: {
                  lat: parseFloat(latitude),
                  lng: parseFloat(longitude),
                },
                map,
                title,
              });
              // Add an InfoWindow
              marker.addListener("click", () => {
                new google.maps.InfoWindow({
                  content: `<h3>${title}</h3>`,
                }).open(map, marker);
              });
            });
            fetchCartDetailsAndUpdateBadge();
            //pickup places end
            $(document).on(
              "click",
              '.custom-bokun-tab-btn[data-tab="pick-up"]',
              function () {
                const exp_id = $(this).data("experience-id");
                if (!exp_id) {
                  console.error("Experience ID is missing.");
                  $("#pickup-list").html("<li>Experience ID is missing.</li>");
                  return;
                }
                // Show loading indicator
                $("#pickup-list").html(
                  '<li class="loading">Loading pickup places...</li>'
                );
                // AJAX request
                $.ajax({
                  url: bokunAjax.ajaxUrl, // WordPress AJAX handler
                  method: "POST",
                  data: {
                    action: "fetch_pickup_places", // Action for PHP handler
                    language: language,
                    currency: currency,
                    experience_id: exp_id, // Pass the experience ID
                  },
                  beforeSend: function () {
                    $("body").append(
                      '<div class="loading-overlay">Fetching pickup places...</div>'
                    );
                  },
                  success: function (response) {
                    $(".loading-overlay").remove(); // Remove overlay
                    if (response.success && response.data.html) {
                      $("#pickup-list").html(response.data.html); // Update list
                    } else {
                      $("#pickup-list").html(
                        "<li>No pickup places found.</li>"
                      );
                    }
                  },
                  error: function (xhr, status, error) {
                    console.error(
                      "Error fetching pickup places:",
                      status,
                      error
                    );
                    $("#pickup-list").html(
                      "<li>An error occurred while fetching pickup places.</li>"
                    );
                  },
                  complete: function () {
                    $(".loading-overlay").remove(); // Ensure overlay removal
                  },
                });
              }
            );
            //pickup places end
            const today = new Date();
            const months = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            let currentMonth = today.getMonth();
            let currentYear = today.getFullYear();
            let isLoading = false; // Track if a request is in progress
            // DOM Elements
            const tableBody = document.getElementById("table-body");
            const monthDisplay = document.getElementById("current-month");
            const timePackageView =
              document.getElementById("time-package-view");
            const checkoutButton = document.getElementById("checkout-button");
            const calendarTable = document.getElementById("calendar-table");
            const calendarHeader = document.querySelector(
              ".custom-bokun-calendar-header"
            );
            const chooseADate = document.querySelector(".choose-a-date-div");
            const formatTimeKey = (time) => {
              const [hour, minute] = time.split(":");
              const formattedHour = hour.padStart(2, "0"); // Ensure 2 digits for the hour
              const formattedMinute = minute.padStart(2, "0"); // Ensure 2 digits for the hour
              return `${formattedHour}:${formattedMinute}`;
            };
            const formatDateKey = (localizedDate) => {
              // console.log("working function");
              if (localizedDate instanceof Date && !isNaN(localizedDate)) {
                const year = localizedDate.getFullYear();
                const month = String(localizedDate.getMonth() + 1).padStart(
                  2,
                  "0"
                ); // Month is 0-indexed
                const day = String(localizedDate.getDate()).padStart(2, "0");
                const isoDate = `${year}-${month}-${day}`; // Return ISO formatted date
                // console.log("Parsed Date Object to ISO:", isoDate);
                return isoDate;
              }
              // Check if the input is a valid string
              if (typeof localizedDate === "string") {
                // Regex to parse the string format "Wed 15.Jan'25"
                const dateRegex = /(\w+)\s(\d{1,2})\.(\w+)'(\d{2})/;
                const match = localizedDate.match(dateRegex);
                if (!match) {
                  console.error(
                    "Invalid localizedDate string format:",
                    localizedDate
                  );
                  return "Invalid-Date";
                }
                const day = match[2]; // Extract day (e.g., 15)
                const monthShort = match[3]; // Extract month short name (e.g., Jan)
                const yearShort = match[4]; // Extract year (e.g., 25 for 2025)
                const monthMap = {
                  Jan: "01",
                  Feb: "02",
                  Mar: "03",
                  Apr: "04",
                  May: "05",
                  Jun: "06",
                  Jul: "07",
                  Aug: "08",
                  Sep: "09",
                  Oct: "10",
                  Nov: "11",
                  Dec: "12",
                };
                const month = monthMap[monthShort] || "01";
                const fullYear = `20${yearShort}`;
                return `${fullYear}-${month}-${day.padStart(2, "0")}`;
              }
              console.error(
                "Invalid input: localizedDate is neither a Date object nor a valid string:",
                localizedDate
              );
              return "Invalid-Date"; // Return default for invalid input
            };
            const addStartTimeIdToAvailableSlots = (
              available_time_slots,
              dateKey,
              startTimeId
            ) => {
              // Initialize the array for the given dateKey if it doesn't exist
              if (!available_time_slots[dateKey]) {
                available_time_slots[dateKey] = [];
              }
              // Check if the startTimeId already exists in the array
              if (!available_time_slots[dateKey].includes(startTimeId)) {
                // Add the startTimeId if it is unique
                available_time_slots[dateKey].push(startTimeId);
              }
            };
            // Calendar Functions
            const updateCalendar = (response, userInput = false) => {
              const matchingObjects = response.data?.availabilities;
              available_dates = [];
              available_time_slots = [];
              if (!matchingObjects) {
                selected_availability_data = null;
                // console.log("No matching object found for this date.");
                // return;
              } else {
                selected_availability_data = matchingObjects.reduce(
                  (acc, obj) => {
                    const dateKey = formatDateKey(obj.localizedDate);
                    const startTimeId = obj.startTimeId;
                    // Ensure we have an object for the dateKey
                    if (!acc[dateKey + "_" + startTimeId]) {
                      acc[dateKey + "_" + startTimeId] = [];
                    }
                    available_dates.push(dateKey);
                    addStartTimeIdToAvailableSlots(
                      available_time_slots,
                      dateKey,
                      startTimeId
                    );
                    // Push the current object into the correct nested array
                    acc[dateKey + "_" + startTimeId].push(obj);
                    return acc;
                  },
                  {}
                );
                selectedPricingCategoriesCount = {}; // clear previous values if any
                $(".custom-bokun-selected-participants").each((i, elm) => {
                  let pcategoryId =
                    parseInt($(elm).attr("data-pricing-category-id")) || 0;
                  let count =
                    parseInt($(elm).find("span.participant-count").text()) || 0;
                  let json = JSON.parse($(elm).attr("data-json"));
                  let groupSize =
                    parseInt(
                      $(
                        `.group-size-dropdown[data-pricing-category-id=${pcategoryId}] option:selected`
                      ).val()
                    ) || 1;
                  if (pcategoryId > 0 && count > 0) {
                    selectedPricingCategoriesCount[pcategoryId] = {
                      count: count,
                      title: json.title,
                      groupSize: groupSize,
                    };
                  }
                });
              }
              tableBody.innerHTML = ""; // Clear the table body
              const currency = localStorage.getItem("currency");
              const firstDay = new Date(currentYear, currentMonth, 1).getDay();
              const daysInMonth = new Date(
                currentYear,
                currentMonth + 1,
                0
              ).getDate(); // Get total days in the month
              // Add blank cells for days before the first day of the month
              for (let i = 1; i < firstDay; i++) {
                const emptyCell = document.createElement("div");
                emptyCell.className = "custom-bokun-calendar-cell empty";
                tableBody.appendChild(emptyCell);
              }
              // Add cells for each day in the month
              for (let day = 1; day <= daysInMonth; day++) {
                const dateString = new Date(
                  currentYear,
                  currentMonth,
                  day
                ).toLocaleDateString("en-CA");
                const cell = document.createElement("div");
                cell.className = "custom-bokun-calendar-cell";
                const spanDay = document.createElement("span");
                spanDay.textContent = day;
                cell.appendChild(spanDay);
                console.log("calculatePricing");
                var default_price = "";
                let passengerCount =
                  parseInt(
                    $(".custom-bokun-participant-controls")
                      .first()
                      .find(".participant-count")
                      .text()
                  ) || 0;
                console.log(dateString);
                const pricingResults = available_dates.includes(dateString)
                  ? calculatePricing(
                      selected_availability_data,
                      dateString,
                      available_time_slots[dateString][0],
                      passengerCount
                    )
                  : null;
                console.log(pricingResults);
                if (pricingResults && pricingResults.length > 0) {
                  const firstPricingResult = pricingResults?.[0];
                  // Ensure passengerCount meets the minimum required per booking
                  if (
                    passengerCount < firstPricingResult.minPerBooking &&
                    !userInput
                  ) {
                    const minPerBooking = firstPricingResult.minPerBooking;
                    $(".custom-bokun-participant-controls")
                      .first()
                      .find(".participant-count")
                      .text(minPerBooking);
                    passengerCount = minPerBooking;
                  }
                  if (passengerCount != firstPricingResult.passengerCount) {
                    default_price = null;
                  } else {
                    // Calculate price based on pricing type
                    if (firstPricingResult.pricedPerPerson) {
                      default_price = firstPricingResult.price * passengerCount;
                    } else {
                      default_price = firstPricingResult.price;
                    }
                  }
                }
                if (!default_price) {
                  default_price = "";
                }
                if (available_dates.includes(dateString)) {
                  const priceSpan = document.createElement("span");
                  priceSpan.className = "custom-bokun-date-value";
                  priceSpan.textContent = `${currency} ${default_price}`;
                  cell.appendChild(priceSpan);
                  cell.addEventListener("click", () =>
                    handleDateClick(response, dateString)
                  );
                } else {
                  cell.classList.add("disabled");
                }
                tableBody.appendChild(cell);
              }
              // Update the displayed month and year
              monthDisplay.textContent = `${months[currentMonth]} ${currentYear}`;
              updateNavigationButtons();
              createPackages(selected_availability_data);
            };
            // Event Handlers
            const handleDateClick = (response, clickedDate) => {
              jQuery("#selectedDate").val(clickedDate);
              jQuery("#selected-date").text(formatDateIntl(clickedDate));
              createTimeSlots(response, clickedDate);
            };
            const createTimeSlots = (response, clickedDate) => {
              if (!clickedDate) return;
              // remove existing timeslot buttons
              $("#time-options").html("");
              if (!selected_availability_data) {
                return;
              }
              // Render Time Slots from Activity JSON
              if (ActivityJson.startTimes) {
                $("#time-options").html("");
                for (const key in ActivityJson.startTimes) {
                  if (
                    Object.prototype.hasOwnProperty.call(
                      ActivityJson.startTimes,
                      key
                    )
                  ) {
                    const dateKey = clickedDate;
                    const startTime = ActivityJson.startTimes[key];
                    const timeKey = formatTimeKey(
                      `${startTime.hour}:${startTime.minute}`
                    );
                    if (
                      selected_availability_data[dateKey + "_" + startTime.id]
                    ) {
                      $("#time-options").append(
                        `<button class="custom-bokun-time-slot" data-selected-time="${timeKey}" data-selected-date="${clickedDate}" data-startTimeId="${
                          startTime.id
                        }" ><span class="time-slot-time"><i class="far fa-clock"></i>  ${timeKey}</span>  ${
                          startTime.externalLabel
                            ? '<span class="time-slot-badge">' +
                              startTime.externalLabel +
                              "</span>"
                            : ""
                        }</button>`
                      );
                    }
                  }
                }
              }
              handleTimeSlots();
              closeCalendarTable();
              setupBackToCalendar();
            };
            const closeCalendarTable = () => {
              calendarTable.style.display = "none";
              calendarHeader.style.setProperty("display", "none", "important");
              chooseADate.style.display = "none";
              timePackageView.style.display = "block";
            };
            function handleTimeSlots() {
              $(".custom-bokun-time-slot").each(function (index) {
                const $timeButton = $(this);
                $timeButton.on("click", function () {
                  selectButton($timeButton);
                  createPackages(selected_availability_data);
                });
              });
              $(".custom-bokun-time-slot").first().trigger("click");
            }
            function selectButton($btn) {
              // Note: $btn[0] is the native DOM element
              jQuery(".custom-bokun-time-slot.selected").removeClass(
                "selected"
              );
              jQuery($btn[0]).addClass("selected");
              $("#selectedTimeSlot").val(jQuery($btn[0]).text());
            }
            function resetPackageStyles($packageDiv) {
              // Remove "selected" class
              $packageDiv.removeClass("selected-package");
            }
            function selectPackageByRateId(
              rate_id = $("#selected_package_price").val()
            ) {
              console.log("Initial rate_id:", rate_id);
              $("#selected_package_price").val(
                rate_id || $("#selected_package_price").val()
              );
              console.log(
                "Updated selected_package_price:",
                $("#selected_package_price").val()
              );
              const packageSelector = `.custom-bokun-package-option${
                rate_id ? `[data-rate-id="${rate_id}"]` : ":first"
              }`;
              console.log("Package selector:", packageSelector);
              $(".custom-bokun-package-option.selected-package").removeClass(
                "selected-package"
              );
              $(packageSelector).addClass("selected-package");
              console.log("Selected package updated.");
            }
            const setupBackToCalendar = () => {
              document
                .querySelectorAll(".back-to-calendar")
                .forEach((button) => {
                  button.onclick = () => {
                    selectedTime = "";
                    selectedDate = "";
                    timePackageView.style.display = "none";
                    calendarTable.style.display = "block";
                    calendarHeader.style.display = "flex";
                    chooseADate.style.display = "block";
                  };
                });
            };
            let selectedParticipants = {};
            // Function to update the `data-pricing-category-id` attribute on the checkout button
            const updatePricingCategoryAttribute = () => {
              const checkoutBtn = $("#checkout-button");
              const formattedData = [];
              $(".custom-bokun-selected-participants").each(function () {
                let pcategoryId = $(this).attr("data-pricing-category-id");
                let groupSize =
                  parseInt(
                    $(
                      `.group-size-dropdown[data-pricing-category-id=${pcategoryId}] option:selected`
                    ).val()
                  ) || 1;
                var countElement =
                  parseInt($(this).find(".participant-count").text()) || 0;
                for (let i = 0; i < countElement; i++) {
                  formattedData.push({
                    pricingCategoryId: pcategoryId,
                    groupSize: groupSize,
                  });
                }
              });
              checkoutBtn.attr(
                "data-pricing-category-id",
                JSON.stringify(formattedData)
              );
            };
            // Function to set default participant values (e.g., Adult = 1)
            const setDefaultParticipants = () => {
              let firstSet = false;
              $(".custom-bokun-selected-participants").each(function () {
                const categoryId = $(this).attr("data-pricing-category-id");
                const countElement = $(this).find(".participant-count");
                // Set the first category to 1, others to 0
                if (!firstSet) {
                  selectedParticipants[categoryId] = 1;
                  countElement.text("1"); // Display 1 as default
                  firstSet = true; // Only set the first participant to 1
                } else {
                  countElement.text("0");
                }
              });
              // Update the checkout button after setting default participants
              updatePricingCategoryAttribute();
            };
            // Initialize default participants on page load
            $(document).ready(() => {
              setDefaultParticipants();
            });
            // [same pricing calculation logic should be applied to calculatePricing function as well]
            const createPackages = (selected_availability_data) => {
              if ($(".custom-bokun-time-slot.selected").length == 0) {
                return;
              }
              const dateKey = $(".custom-bokun-time-slot.selected")
                .attr("data-selected-date")
                .trim();
              const timeKey = $(".custom-bokun-time-slot.selected")
                .attr("data-selected-time")
                .trim();
              const startTimeId =
                parseInt(
                  $(".custom-bokun-time-slot.selected")
                    .attr("data-startTimeId")
                    .trim()
                ) || null;
              console.log(dateKey);
              console.log(timeKey);
              console.log(startTimeId);
              // Clear previous packages
              var number_of_packages = 0;
              $("#package-options").html(``);
              if (selected_availability_data[dateKey + "_" + startTimeId]) {
                const availabilities =
                  selected_availability_data[dateKey + "_" + startTimeId];
                for (const _key in availabilities) {
                  if (
                    Object.prototype.hasOwnProperty.call(availabilities, _key)
                  ) {
                    const rates = availabilities[_key]?.rates ?? null;
                    const prices = availabilities[_key]?.pricesByRate ?? null; // in case PricedPerPerson
                    const availabilityCount = availabilities[_key]?.availabilityCount ?? null;
                    if (availabilities[_key]?.startTimeId !== startTimeId) {
                      return;
                    }
                    if (!rates || !prices) {
                      console.error(
                        "Prices missing from availabilities object"
                      );
                      return;
                    }
                    // loops rates
                    for (const rt_key in rates) {
                      if (Object.prototype.hasOwnProperty.call(rates, rt_key)) {
                        const rate = rates[rt_key];
                        const priceByRate = prices.find(
                          (p) => p.activityRateId === rate.id
                        );
                        console.log(`priceByRate:`, priceByRate);
                        console.log(`the rate :`, rate);
                        var skip = false;
                        var price = 0;
                        var minPerBooking = null;
                        var maxPerBooking = null;
												pricingCategoryTotalCount = 0;
                        // Determine the price based on whether pricing is per person or not
                        if (rate.pricedPerPerson === false) {
                          var total_passengers = 0;
                          for (const pricingCategoryId in selectedPricingCategoriesCount) {
                            if (
                              Object.prototype.hasOwnProperty.call(
                                selectedPricingCategoriesCount,
                                pricingCategoryId
                              )
                            ) {
                              const selectedPricingCategory =
                                selectedPricingCategoriesCount[
                                  pricingCategoryId
                                ];
                              total_passengers +=
                                selectedPricingCategory["count"] *
                                selectedPricingCategory["groupSize"];
                              price = priceByRate
                                ? priceByRate.pricePerBooking?.amount
                                : 0;
                              minPerBooking = rate.minPerBooking;
                              maxPerBooking = rate.maxPerBooking;
                              selectedPricingCategoriesCount[pricingCategoryId][
                                "price"
                              ] = priceByRate
                                ? priceByRate.pricePerBooking?.amount
                                : 0;
                              selectedPricingCategoriesCount[pricingCategoryId][
                                "minPerBooking"
                              ] = rate.minPerBooking;
                              selectedPricingCategoriesCount[pricingCategoryId][
                                "maxPerBooking"
                              ] = rate.maxPerBooking;
                            }
                          }
                          if (total_passengers > 0) {
                            const minPerBooking = rate.minPerBooking ?? 0;
                            const maxPerBooking =
                              rate.maxPerBooking ?? Infinity;
                            console.log(
                              "Debug: Total passengers:",
                              total_passengers
                            );
                            console.log(
                              "Debug: Min per booking:",
                              minPerBooking
                            );
                            console.log(
                              "Debug: Max per booking:",
                              maxPerBooking
                            );
                            if (
                              total_passengers < minPerBooking ||
                              total_passengers > maxPerBooking
                            ) {
                              console.log(
                                "Debug: Total passengers out of range. Resetting prices and counts."
                              );
                              $("#package-options-error").text(
                                `Total participants out of range.`
                              );
                              skip = true;
                            }
                            console.log(
                              "Debug: Updated selectedPricingCategoriesCount:",
                              JSON.stringify(
                                selectedPricingCategoriesCount,
                                null,
                                2
                              )
                            );
                          }
                        } else {
                          if (rate.tieredPricingEnabled) {
                            console.log(`Tiers: True`);
                            // Price per person with tiers
                            for (const tkey in rate.tiers) {
                              if (
                                Object.prototype.hasOwnProperty.call(
                                  rate.tiers,
                                  tkey
                                )
                              ) {
                                const tier = rate.tiers[tkey];
                                console.log(`Trier Details: `);
                                console.log(tier);
                                minPerBooking = tier.minPassengersRequired;
                                maxPerBooking =
                                  tier.maxPassengersRequired ?? Infinity;
                                const groupSize =
                                  selectedPricingCategoriesCount?.[
                                    tier.pricingCategoryId
                                  ]?.["groupSize"];
                                const passengers_count =
                                  parseInt(
                                    selectedPricingCategoriesCount?.[
                                      tier.pricingCategoryId
                                    ]?.["count"] * groupSize
                                  ) || 0;
                                if (
                                  priceByRate.activityRateId ==
                                    tier.activityRateId &&
                                  passengers_count >= minPerBooking &&
                                  passengers_count <= maxPerBooking
                                ) {
                                  for (const pricePerCategoryUnit of priceByRate.pricePerCategoryUnit) {
                                    if (
                                      tier.pricingCategoryId ==
                                        pricePerCategoryUnit.id &&
                                      priceByRate.activityRateId ==
                                        tier.activityRateId &&
                                      passengers_count >=
                                        pricePerCategoryUnit.minParticipantsRequired &&
                                      passengers_count <=
                                        (pricePerCategoryUnit.maxParticipantsRequired ??
                                          Infinity)
                                    ) {
                                      selectedPricingCategoriesCount[
                                        tier.pricingCategoryId
                                      ]["price"] =
                                        pricePerCategoryUnit.amount.amount;
                                      selectedPricingCategoriesCount[
                                        tier.pricingCategoryId
                                      ]["minPerBooking"] =
                                        tier.minPassengersRequired;
                                      selectedPricingCategoriesCount[
                                        tier.pricingCategoryId
                                      ]["maxPerBooking"] =
                                        tier.maxPassengersRequired;
                                    }
                                  }
                                } else {
                                }
                              }
                            }
                          } else {
                            console.log(`Tiers: False`);
                            // Price per person without tiers
                            for (const pricingCategoryId in selectedPricingCategoriesCount) {
                              const groupSize =
                                selectedPricingCategoriesCount?.[
                                  pricingCategoryId
                                ]?.["groupSize"];
                              let ncount =
                                parseInt(
                                  selectedPricingCategoriesCount?.[
                                    pricingCategoryId
                                  ]?.["count"] * groupSize
                                ) || 0;
                              console.log(
                                `Processing Pricing Category ID: ${pricingCategoryId}`
                              );
                              console.log(
                                `Participant Count for Category ${pricingCategoryId}: ${ncount}`
                              );
                              // Iterate over category units to calculate pricing
                              for (const _pcategory in priceByRate.pricePerCategoryUnit) {
                                const categoryObject =
                                  priceByRate.pricePerCategoryUnit[_pcategory];
                                console.log(`Category Object:`, categoryObject);
                                const categoryMin =
                                  categoryObject.minParticipantsRequired;
                                const categoryMax =
                                  categoryObject.maxParticipantsRequired ??
                                  Infinity;
                                console.log(
                                  `Category Min Participants Required: ${categoryMin}`
                                );
                                console.log(
                                  `Category Max Participants Required: ${categoryMax}`
                                );
                                // Check if the start time id matches and the ncount falls within the min/max booking range
                                if (
                                  categoryObject.id == pricingCategoryId &&
                                  ncount >= categoryMin &&
                                  ncount <= categoryMax
                                ) {
                                  console.log(
                                    `Match Found for Pricing Category ID ${pricingCategoryId}`
                                  );
                                  selectedPricingCategoriesCount[
                                    pricingCategoryId
                                  ]["price"] =
                                    parseFloat(
                                      categoryObject?.amount?.amount
                                    ) || 0;
                                  selectedPricingCategoriesCount[
                                    pricingCategoryId
                                  ]["minPerBooking"] =
                                    categoryObject.minParticipantsRequired;
                                  selectedPricingCategoriesCount[
                                    pricingCategoryId
                                  ]["maxPerBooking"] =
                                    categoryObject.maxParticipantsRequired;
                                  console.log(
                                    `Price Set for Category ${pricingCategoryId}: ${selectedPricingCategoriesCount[pricingCategoryId]["price"]}`
                                  );
                                } else {
                                  console.log(
                                    `No match for Pricing Category ID ${pricingCategoryId} with participant count ${ncount}`
                                  );
                                }
                              }
                            }
                          }
                        }
                        // Aggregate the prices for all selected pricing categories
                        console.log("\n--- Aggregating Prices ---");
                        for (const spricingCategory_id in selectedPricingCategoriesCount ||
                          {}) {
                          const categoryData =
                            selectedPricingCategoriesCount[spricingCategory_id];
                          console.log("Category Data:", categoryData);
													// if (categoryData["price"]) {
                            console.log(
                              `Aggregated Price: ${categoryData["price"]}`
                            );
                            if (rate.pricedPerPerson) {
															price += parseFloat(categoryData["price"] * categoryData["count"]) || 0;
                            } else {
															price = parseFloat(categoryData["price"]) || 0;
                            }
                            if (
                              !pricingCategoryprices[
                                spricingCategory_id +
                                  "_" +
                                  rate.id +
                                  "_" +
                                  dateKey +
                                  "_" +
                                  startTimeId
                              ]
                            ) {
                              pricingCategoryprices[
                                spricingCategory_id +
                                  "_" +
                                  rate.id +
                                  "_" +
                                  dateKey +
                                  "_" +
                                  startTimeId
                              ] = {};
                            }
                            let unit_price = rate.pricedPerPerson
                              ? categoryData["price"]
                              : priceByRate.pricePerBooking?.amount;
                            pricingCategoryprices[
                              spricingCategory_id +
                                "_" +
                                rate.id +
                                "_" +
                                dateKey +
                                "_" +
                                startTimeId
                            ] = {
                              rate_d: rate.id,
                              pricing_category_id:
                                parseInt(spricingCategory_id),
                              date_slot: dateKey,
                              time_slot: timeKey,
                              count: categoryData["count"],
                              groupSize: categoryData["groupSize"],
                              price: unit_price,
                              is_free: unit_price == 0,
                              pricedPerPerson: rate.pricedPerPerson,
                              tieredPricingEnabled: rate.tieredPricingEnabled,
                              minPerBooking: categoryData["minPerBooking"],
                              maxPerBooking: categoryData["maxPerBooking"],
															rate_minPerBooking: rate.minPerBooking,
															rate_maxPerBooking: rate.maxPerBooking,
                              availabilityCount: availabilityCount
                            };

														pricingCategoryTotalCount += categoryData["count"] * categoryData["groupSize"];
													// }
                          }

                        console.log(`Total Price after Aggregation: ${price}`);
                        console.log(`Skip Flag: ${skip}`);
                        console.log(
                          `Final Price for Rate ${rate.id}: ${price}`
                        );
                        if (price == 0) {
                          $("#package-options-error").text(
                            `The price for your current selection is unavailable.`
                          );
                        }
                        if (skip || price == 0) {
                          console.log(
                            `Skipping Rate ID ${rate.id} due to skip flag or zero price.`
                          );
                        } else {
                          const selectedDateforCancellationPolicy =  jQuery("#selectedDate").val();
                          const selectedTimeforCancellationPolicy =  jQuery("#selectedTimeSlot").val();
                          
                          const $packageDiv = $("<div>", {
                            class: `custom-bokun-package-option`,
                            "data-rate-id": rate.id,
                            "data-name": rate.title,
                            "data-price": price,
                          }).html(`
                        <div style="display: flex; justify-content: space-between; align-items: center; position: relative;">
                             <span class="package-option-title">
                                 ${rate.title ?? ""}
                             </span>
                             <div>
                               <span class="package-option-price">${currency} <span id="package_actual_price">${price}</span></span>
                             </div>
                                              </div>
                           <div class="package-option-sub-title">${rate.description ?? ""}</div>
                           <div class="custom-bokun-package-content" style="padding: 10px; border-top: 1px solid #E0E0E0;">
                             <ul style="list-style: none; padding: 0; margin: 0;">
                             <li>
                             <i class="fas fa-bus"></i>
                                   Pick up available:
                                   ${
                                     rate.pickupPricingType ===
                                     "INCLUDED_IN_PRICE"
                                       ? "Included in price"
                                       : "Not included in price"
                                   }
                             </li>
                             <li>
                             <i class="fas fa-bus"></i>
                                   Drop off available:
                                   ${
                                     rate.dropoffPricingType ===
                                     "INCLUDED_IN_PRICE"
                                       ? "Included in price"
                                       : "Not included in price"
                                   }
                             </li>
                             <li>
                                  ${rate.maxPerBooking ? " <i class='fas fa-info'></i> Can be booked upto "+ rate.maxPerBooking : ""}
                             </li>
                             </ul>
                             <div style="margin-top: 10px;">
                               <strong>Cancellation policy</strong>
                               <p style="margin: 0; color: #666;"><i class="fas fa-history"></i> ${
                                 rate.cancellationPolicy.title
                               }</p>
                               <li style="margin-left: 20px;">
                                 Fully Refundable upto ${selectedDateforCancellationPolicy} at ${selectedTimeforCancellationPolicy}
                               </li>
                               <li style="margin-left: 20px;">
                                 Non Refundable after ${selectedDateforCancellationPolicy} at ${selectedTimeforCancellationPolicy}
                               </li>
                             </div>
                        </div>
                         `);
                          console.log(
                            `Creating Package Div for Rate ID ${rate.id}`
                          );
                          // Append to container
                          $("#package-options").append($packageDiv);
                          number_of_packages += 1;
                          console.log(
                            `Number of Packages after Addition: ${number_of_packages}`
                          );
                        }
                      }
                    }
                    selectPackageByRateId();
                    $(".custom-bokun-package-option").click(function () {
                      let prateid = $(this).attr("data-rate-id");
                      selectPackageByRateId(prateid);
                      createPackages(selected_availability_data);
                    });
                    console.log(
                      `\n--- Final Package Count: ${number_of_packages} ---`
                    );
                    if (number_of_packages == 0) {
                      console.log(
                        "No packages found. Displaying error message."
                      );
                      $("#package-options-error").show();
                      $(".custom-bokun-ticket-wrapper").hide();
                      $(".package-options-default-content").hide();
                    }
                    if (number_of_packages == 1) {
                      // console.log('Only one package available. Hiding package options.');
                      // $(".package-options-default-content").hide();
                      $("#package-options-error").text(``).hide();
                      $(".custom-bokun-ticket-wrapper").show();
                      $(".package-options-default-content").show();
                    }
                    if (number_of_packages > 1) {
                      console.log(
                        "Multiple packages available. Showing package options."
                      );
                      $("#package-options-error").text(``).hide();
                      $(".custom-bokun-ticket-wrapper").show();
                      $(".package-options-default-content").show();
                    }
                    calculateTotalPrice();
                  }
                }
              }
            };
            const calculatePricing = (
              selected_availability_data,
              dateKey,
              startTimeId = null,
              passengers_count = 1
            ) => {
              if (!dateKey || !startTimeId) {
                console.error(
                  "Invalid parameters: dateKey or startTimeId is missing."
                );
                return [];
              }
              const availabilityKey = `${dateKey}_${startTimeId}`;
              if (!selected_availability_data[availabilityKey]) {
                console.warn(
                  `No availability data found for the key: ${availabilityKey}`
                );
                return [];
              }
              const availabilities =
                selected_availability_data[availabilityKey];
              const pricingResults = [];
              const tryToFindPrices = (passengerCount) => {
                for (const availability of availabilities) {
                  const rates = availability.rates ?? [];
                  const pricesByRate = availability.pricesByRate ?? [];
                  for (const rate of rates) {
                    const priceByRate = pricesByRate.find(
                      (p) => p.activityRateId === rate.id
                    );
                    if (!priceByRate) continue;
                    const minPerBooking = rate.minPerBooking ?? 0;
                    const maxPerBooking = rate.maxPerBooking ?? Infinity;
                    // Process fixed-price rates
                    if (!rate.pricedPerPerson) {
                      const matchingPrice =
                        priceByRate.pricePerBooking?.amount ?? null;
                      if (
                        passengerCount >= minPerBooking &&
                        passengerCount <= maxPerBooking &&
                        matchingPrice !== null
                      ) {
                        pricingResults.push({
                          rateId: rate.id,
                          passengerCount: passengerCount,
                          price: matchingPrice,
                          pricedPerPerson: false,
                          tieredPricingEnabled: false,
                          minPerBooking,
                          maxPerBooking,
                        });
                      }
                    }
                    // Process `pricePerCategoryUnit` for tiered and non-tiered pricing
                    for (const unit of priceByRate.pricePerCategoryUnit || []) {
                      const unitMin = unit.minParticipantsRequired ?? 0;
                      const unitMax = unit.maxParticipantsRequired ?? Infinity;
                      if (
                        passengerCount >= unitMin &&
                        passengerCount <= unitMax
                      ) {
                        pricingResults.push({
                          rateId: rate.id,
                          passengerCount: passengerCount,
                          price: unit.amount.amount,
                          pricedPerPerson: true,
                          tieredPricingEnabled: rate.tieredPricingEnabled,
                          minPerBooking: unitMin,
                          maxPerBooking: unitMax,
                        });
                      }
                    }
                  }
                }
              };
              // Try with the provided passengers_count
              tryToFindPrices(passengers_count);
              // If no prices found, try with 2 passengers (for fallback logic)
              if (pricingResults.length === 0 && passengers_count === 1) {
                console.log(
                  "No prices found for 1 passenger. Retrying with 2 passengers..."
                );
                tryToFindPrices(2);
              }
              return pricingResults;
            };
            $(".group-size-dropdown").change(function () {
              updatePricingCategoryAttribute();
              updateCalendar(triggerApiCallResponse, true);
            });
            // Event handler for increasing the participant count
            $(".inc-pcount").click(function () {
              var countElement = $(this).siblings(".participant-count");
              var count = parseInt(countElement.text(), 10);
              var categoryId = $(this)
                .closest(".custom-bokun-selected-participants")
                .attr("data-pricing-category-id");
              countElement.text(count + 1);
              if (!selectedParticipants[categoryId])
                selectedParticipants[categoryId] = 0;
              selectedParticipants[categoryId] += 1;
              updatePricingCategoryAttribute();
              updateCalendar(triggerApiCallResponse, true);
            });
            // Event handler for decreasing the participant count
            $(".dec-pcount").click(function () {
              var countElement = $(this).siblings(".participant-count");
              var count = parseInt(countElement.text(), 10);
              var categoryId = $(this)
                .closest(".custom-bokun-selected-participants")
                .attr("data-pricing-category-id");
              if (count > 0) {
                countElement.text(count - 1);
                selectedParticipants[categoryId] -= 1;
                if (selectedParticipants[categoryId] === 0)
                  delete selectedParticipants[categoryId];
                updatePricingCategoryAttribute();
              }
              updateCalendar(triggerApiCallResponse, true);
            });
            function calculateTotalPrice() {
              const startTimeId =
                parseInt(
                  $(".custom-bokun-time-slot.selected")
                    .attr("data-startTimeId")
                    .trim()
                ) || null;
              const dateKey = $(".custom-bokun-time-slot.selected")
                .attr("data-selected-date")
                .trim();
              const timeKey = $(".custom-bokun-time-slot.selected")
                .attr("data-selected-time")
                .trim();
              const rate_id =
                parseInt(
                  $(".custom-bokun-package-option.selected-package").attr(
                    "data-rate-id"
                  )
                ) || null;
              const dateToShow = formatDateToCustom(dateKey);
              const timeToShow = timeKey;
              const currency = localStorage.getItem("currency");
              const customBookingTitle = $(".custom-booking-title").text();
              var participants_list = "";
              var totalPrice = 0;
              var time_badge = ``;
							var is_pricedPerPerson = false;
							var number_of_participants_out_of_range = false;
              if (selectedPricingCategoriesCount) {
                for (const pricing_category_id in selectedPricingCategoriesCount) {
                  const pricingCategory =
                    selectedPricingCategoriesCount[pricing_category_id];
                  const pricingKey = `${pricing_category_id}_${rate_id}_${dateKey}_${startTimeId}`;
									console.log(`pricingCategoryprices`, pricingCategoryprices);
                  const package_price = pricingCategoryprices[pricingKey];
									console.log(`package_price`, package_price);
                  const pprice = package_price?.price || 0;
                  console.log(`pricing_key: ${pricingKey}`);
                  console.log(`final price: ${pprice}`);

									console.log(`package_price?.rate_minPerBooking`,package_price?.rate_minPerBooking)
									console.log(`package_price?.rate_maxPerBooking`,package_price?.rate_maxPerBooking)

									if (
										package_price?.rate_minPerBooking &&
										package_price?.rate_maxPerBooking &&
										(
											pricingCategoryTotalCount < package_price.rate_minPerBooking ||
											pricingCategoryTotalCount > package_price.rate_maxPerBooking
										)
									) {
										totalPrice = 0;
										number_of_participants_out_of_range = true;
									}

                  console.log(`availabilityCount`,package_price?.availabilityCount);
                  console.log(`pricingCategoryTotalCount`,pricingCategoryTotalCount);
                  if(package_price?.availabilityCount && package_price?.availabilityCount < pricingCategoryTotalCount){
                    totalPrice = 0;
										number_of_participants_out_of_range = true;
                    $("#package-options-error").text(
                      `Your selection is not available for this date.`
                    );
                  }
                  console.log(`number_of_participants_out_of_range`,number_of_participants_out_of_range);


                  if (package_price?.pricedPerPerson === true) {
										is_pricedPerPerson = true;
										totalPrice += parseFloat(pprice * pricingCategory.count) || 0;
									} else if (!is_pricedPerPerson) {
                    totalPrice = parseFloat(pprice) || 0;
                  }
                  const price_html =
                    package_price?.pricedPerPerson || package_price?.is_free
                      ? `<strong id="ticket-adults">${pricingCategory.count} x ${currency} ${pprice}</strong>`
                      : `<strong id="ticket-adults">${pricingCategory.count}</strong>`;
                  participants_list += `<p class="custom-bokun-ticket-participant">${pricingCategory.title} : ${price_html}</p>`;
                }
              }
							if (startTimeId && !number_of_participants_out_of_range) {
                let badge_text = $(
                  ".custom-bokun-time-slot.selected span.time-slot-badge"
                ).text();
                time_badge = `<span class="ticket-time-badge">${badge_text}</span>`;
              }
              $(".custom-bokun-ticket").html(`
                              <!-- Left Side -->
                              <div class="custom-bokun-ticket-left">
                                <h3>${customBookingTitle}</h3>
                                ${participants_list}
                              </div>
                              <!-- Middle Tear Line -->
                              <div class="custom-bokun-ticket-tear-line">
                                <span>TEAR HERE</span>
                              </div>
                              <!-- Right Side -->
                              <div class="custom-bokun-ticket-right">
                                <div class="custom-bokun-ticket-time" id="ticket-time">
                                  <span class="ticket-time-display">${timeToShow ?? "--:--"
                                  }</span>
                                  ${time_badge}
                                </div>
                                <div class="custom-bokun-ticket-date" id="ticket-date">
                                  ${dateToShow ?? "----:--"}
                                </div>
                                <div class="custom-bokun-ticket-total">
                                    <span class="small-text">Total:</span>
                                    <span id="ticket-total"> ${currency} ${totalPrice}</span>
                                </div>
                              </div>
                            `);
							if (dateKey && timeKey && rate_id && !number_of_participants_out_of_range) {
                $("#checkout-button").attr("data-date", dateKey);
                $("#checkout-button").attr("data-time-id", timeKey);
                $("#checkout-button").attr("data-rate-id", rate_id);
                enableCheckoutButton();
              } else {
                disableCheckoutButton();
              }

              if(number_of_participants_out_of_range){
                $("#package-options-error").show();
                $(".custom-bokun-ticket-wrapper").hide();
                $(".package-options-default-content").hide();
              }
            }
            const enableCheckoutButton = function () {
              $("#checkout-button").prop("disabled", false);
              $("#checkout-button").css("background", "#007BFF");
              $("#checkout-button").css("cursor", "pointer");
            };
            const disableCheckoutButton = function () {
              $("#checkout-button").prop("disabled", true);
              $("#checkout-button").css("background", "#CCCCCC");
              $("#checkout-button").css("cursor", "not-allowed");
            };
            // API Call
            const triggerApiCall = () => {
              //if (isLoading) return;
              isLoading = true;
              const start_date = `${currentYear}-${String(
                currentMonth + 1
              ).padStart(2, "0")}-01`;
              const end_date = `${currentYear}-${String(
                currentMonth + 1
              ).padStart(2, "0")}-${new Date(
                currentYear,
                currentMonth + 1,
                0
              ).getDate()}`;
              $.ajax({
                url: bokunAjax.ajaxUrl,
                method: "POST",
                data: {
                  action: "fetch_experience_availability",
                  experience_id: experienceId,
                  start_date,
                  end_date,
                  currency: localStorage.getItem("currency"),
                  language: localStorage.getItem("language"),
                },
                beforeSend: () => {
                  tableBody.innerHTML = '<div class="loading">Loading...</div>';
                },
                success: (response) => {
                  triggerApiCallResponse = response;
                  updateCalendar(triggerApiCallResponse);
                  if(response?.success === false){
                    callForNextMonth();
                  }
                },
                error: () => {
                  tableBody.innerHTML =
                    '<div class="error">Error loading availability.</div>';
                },
                complete: () => {
                  isLoading = false;
                  updateNavigationButtons();
                },
              });
            };
            function callForNextMonth(){
              console.log("callForNextMonth function called");

              if (isLoading || (currentMonth === 11 && currentYear === today.getFullYear() + 1)) {
                  console.warn("Stopping next month call: already loading or reached the max year.");
                  // return;
              }
              currentMonth = (currentMonth + 1) % 12;
              if (currentMonth === 0) currentYear++;
          
              console.log(`Fetching data for next month: ${currentMonth + 1}/${currentYear}`);
              triggerApiCall();
          }
          
            // Navigation Buttons
            const updateNavigationButtons = () => {
              const prevButton = document.getElementById("prev-month");
              const nextButton = document.getElementById("next-month");
              prevButton.disabled =
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear();
              prevButton.style.cursor = prevButton.disabled
                ? "not-allowed"
                : "pointer";
              nextButton.disabled =
                currentMonth === 11 && currentYear === today.getFullYear() + 1;
              nextButton.style.cursor = nextButton.disabled
                ? "not-allowed"
                : "pointer";
            };
            document.getElementById("prev-month").onclick = () => {
              if (
                isLoading ||
                (currentMonth === 0 && currentYear === today.getFullYear())
              )
                return;
              currentMonth = (currentMonth - 1 + 12) % 12;
              if (currentMonth === 11) currentYear--;
              triggerApiCall();
            };
            document.getElementById("next-month").onclick = () => {
              if (
                isLoading ||
                (currentMonth === 11 && currentYear === today.getFullYear() + 1)
              )
                return;
              currentMonth = (currentMonth + 1) % 12;
              if (currentMonth === 0) currentYear++;
              triggerApiCall();
            };
            // Initial API Call
            triggerApiCall();
          }
        } else {
          alert("Failed to fetch experience details: " + response.data);
        }
      },
      error: function () {
        $(".loading-overlay").remove(); // Remove loading overlay
        alert("An error occurred while fetching the experience details.");
      },
    });
  }
  // Function to attach modal event listeners dynamically
  function attachModalEventListeners(modal) {
    renderCustomBokunRatingCircles();
    const closeModalBtn = modal.querySelector(".custom-bokun-close-btn");
    const tabButtons = document.querySelectorAll(".custom-bokun-tab-btn");
    const tabContents = document.querySelectorAll(".custom-bokun-tab-content");
    const participantCount = document.getElementById("participant-count");
    let count = 1;
    // Close Modal
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        tabContents.forEach((content) => (content.style.display = "none"));
        document.getElementById(button.dataset.tab).style.display = "block";
      });
    });
  }
  function formatDateToCustom(dateStr) {
    // Parse the ISO string into a Date object
    if (!dateStr) {
      return dateStr;
    }
    const dateObj = new Date(dateStr);
    // Arrays for days and months
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    // Extract parts
    const dayOfWeek = days[dateObj.getDay()];
    const dayOfMonth = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    // Construct the final string: Fri 27 December 2024
    return `${dayOfWeek} ${dayOfMonth} ${monthName} ${year}`;
  }
  /**************************
   * CAROUSEL FUNCTIONALITY
   **************************/
  function initializeCarousel($) {
    const $imgWrappers = jQuery("#slideshow").find(".img-wrapper");
    const $thumbs = jQuery("#slideshow").find(".thumb");
    const $prevBtn = $("#prev-btn");
    const $nextBtn = $("#next-btn");
    let activeIndex = 0; // Track active image
    // Ensure carousel elements exist
    if (!$prevBtn.length) console.error("Previous button not found: #prev-btn");
    if (!$nextBtn.length) console.error("Next button not found: #next-btn");
    if (!$imgWrappers.length)
      console.error("Image wrappers not found: .img-wrapper");
    if (!$thumbs.length) console.error("Thumbnail elements not found: .thumb");
    // Function to Update Active Image
    function updateActiveImage(newIndex) {
      if (newIndex < 0) newIndex = $imgWrappers.length - 1;
      if (newIndex >= $imgWrappers.length) newIndex = 0;
      $imgWrappers.removeClass("active").eq(newIndex).addClass("active");
      $thumbs.removeClass("active").eq(newIndex).addClass("active");
      activeIndex = newIndex;
    }
    // Event Listener: Next Button
    $nextBtn.on("click", function () {
      updateActiveImage(activeIndex + 1);
    });
    // Event Listener: Previous Button
    $prevBtn.on("click", function () {
      updateActiveImage(activeIndex - 1);
    });
    // Event Listener: Thumbnails
    $thumbs.on("click", function () {
      const index = $thumbs.index(this);
      updateActiveImage(index);
    });
    // Initialize first image as active
    updateActiveImage(0);
  }
  function updateCartBadge(count) {
    const cartBadge = document.getElementById("cartBadge");
    if (count > 0) {
      cartBadge.innerText = count;
      cartBadge.style.display = "block";
      document.querySelector("#cartCheckoutBtn").classList.add("clickable");
    } else {
      cartBadge.innerText = "0";
      cartBadge.style.display = "none";
      document.querySelector("#cartCheckoutBtn").classList.remove("clickable");
    }
  }

  // Modal Toggle Setup
  function setupCartModalToggle() {
    const $cartButton = $(".custom-bokun-header-btn");
    const $cartModal = $(".custom-bokun-cart-modal");

    if (!$cartButton.data("initialized")) {
        $cartButton.on("click", function (e) {
            e.stopPropagation(); 
            $cartModal.toggle();
        });

        $(window).on("click", function (e) {
            if (
                !$cartModal.is(e.target) &&
                !$cartModal.has(e.target).length &&
                !$(e.target).closest(".custom-bokun-header-btn").length
            ) {
                $cartModal.hide();
            }
        });

        $cartButton.data("initialized", true);
    }
}

  window.fetchCartDetailsAndUpdateBadge = function (){
    const sessionId = localStorage.getItem("bokunSessionId");
    if (!sessionId) {
      console.error("Session ID is missing!");
      return;
    }

    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      dataType: "json",
      data: {
        action: "get_cart_details",
        session_id: sessionId,
        language: localStorage.getItem("language"),
        currency: localStorage.getItem("currency"),
      },
      success: function (response) {
        const {
          size: count,
          activityBookings,
          totalPrice,
          lineItems,
        } = response.data;
        const currency = localStorage.getItem("currency");

        // Helper: Generate Line Items Content
        const generateLineItemsContent = (lineItems) => {
          if (!lineItems || lineItems.length === 0) return "";
          return lineItems
            .map(
              (item) => `
                <div class="custom-checkout-info-row">
                    <span>${item.title} × ${item.people || item.quantity}</span>
                    <span class="info-price">${item.totalAsText}</span>
                </div>
              `
            )
            .join("");
        };

        // Helper: Generate Activity Booking Content
        const generateBookingContent = (bookings) => {
          return bookings
            .map((booking, index) => {
              const pickupType =
                booking.rate?.pickupPricingType === "INCLUDED_IN_PRICE"
                  ? "Included"
                  : "Not Included";
              const dropoffType =
                booking.rate?.dropoffPricingType === "INCLUDED_IN_PRICE"
                  ? "Included"
                  : "Not Included";

              const lineItemsContent = generateLineItemsContent(lineItems);

              return `
                <div class="cart-item" data-product-code="${booking.productConfirmationCode}">
                    <div class="cart-item-header">
                        <p>${booking.activity.title}</p>
                        <div class="cart-item-price-container">
                          <small class="cart-item-price">${currency} ${booking.totalPrice}</small>
                          <button data-product-code="${booking.productConfirmationCode}" class="cart-item-remove">&times;</button>
                        </div>
                    </div>
                    <small>${booking.dateString}</small><br>
                    <a href="#" class="toggle-details" data-index="${index}">Show more</a>
                    <div class="cart-item-details" id="details-${index}">
                        ${lineItemsContent}
                        <p><span>Pick-up </span><span class="cart-detail-info">${pickupType}</span></p>
                        <p><span>Drop-off</span><span class="cart-detail-info">${dropoffType}</span></p>
                    </div>
                </div>
              `;
            })
            .join("");
        };

        // Generate Modal Content
        const cartModalContent = `
          <div class="custom-bokun-cart-modal-content">
              <div class="custom-bokun-cart-modal-header">
                  <button id="cartCheckoutBtn" ${
                    totalPrice === 0 ? "disabled" : ""
                  }>Checkout</button>
              </div>
              <div class="custom-bokun-cart-modal-body">
                  ${generateBookingContent(activityBookings || [])}
              </div>
              <div class="custom-bokun-cart-modal-footer">
                  <div>Total</div>
                  <div>${currency} ${totalPrice}</div>
              </div>
          </div>
        `;

        // Update Modal Content and Cart Badge
        $("#customBokunCartModal").html(cartModalContent);
        updateCartBadge(count);

        // Add Event Listeners for "Show more" toggle
        $(".toggle-details").on("click", function (e) {
          e.preventDefault();
          const index = $(this).data("index");
          const $details = $(`#details-${index}`);
          $details.toggleClass("show");
          $(this).text(function (_, text) {
            return text === "Show more" ? "Show less" : "Show more";
          });
        });

        // Setup Modal Toggle
        setupCartModalToggle();
      },
      error: function (error) {
        console.error("AJAX Error:", error);
        updateCartBadge(0);
      },
    });
  }

  $(document).on("click", ".cart-item-remove", function () {
    const $clickedElement = $(this);
    const productConfirmationCode = $clickedElement.data("product-code");
    const $parentDiv = $clickedElement.closest(".cart-item");
    $parentDiv
      .addClass("disabled")
      .css({ opacity: "0.5", pointerEvents: "none" });
    if (!productConfirmationCode) {
      console.error("Error: Product Confirmation Code is missing.");
      return;
    }
    $clickedElement.prop("disabled", true).css("opacity", "0.5");
    removePreviousActivity(productConfirmationCode);
  });
  function removePreviousActivity(productConfirmationCode) {
    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: {
        action: "remove_activity_form_cart",
        session_id: localStorage.getItem("bokunSessionId"),
        product_confirmation_code: productConfirmationCode,
        language: localStorage.getItem("language"),
        currency: localStorage.getItem("currency"),
      },
      success: function (response) {
        if (response.success) {
          fetchCartDetailsAndUpdateBadge();
        } else {
          console.error(
            "Error removing previous activity:",
            response.data.message
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX error:", status, error);
        toggleButtons(false);
      },
    });
  }
});
function fetchExperiencePrices() {
  // Collect all experience IDs from the page
  const experienceIds = [];
  var language = localStorage.getItem("language");
  var currency = localStorage.getItem("currency");
  jQuery(".custom-bokun-card").each(function () {
    const experienceId = jQuery(this).data("experience-id");
    if (experienceId) {
      experienceIds.push(experienceId);
    }
  });
  if (experienceIds.length === 0) {
    console.warn("No experience IDs found.");
    return;
  }
  // Make the AJAX request
  jQuery.ajax({
    url: bokunAjax.ajaxUrl,
    method: "POST",
    data: {
      action: "fetch_experience_prices",
      language: language,
      currency: currency,
      experience_ids: experienceIds,
    },
    success: function (response) {
      if (response.success) {
        // Loop through the response data and update the HTML elements
        jQuery.each(response.data, function (experienceId, prices) {
          const $card = jQuery(
            `.custom-bokun-card[data-experience-id="${experienceId}"]`
          );
          if ($card.length) {
            const $priceElement = $card.find(".custom-bokun-from-style");
            if ($priceElement.length) {
              // Update the price text
              if ($priceElement.length) {
                const priceText = prices.currency + " " + (prices.price || "0");
                $priceElement.text(priceText);
                if (parseInt(prices.price) > 0)
                  $card.removeClass("hidden").fadeIn("slow");
              }
            }
          }
        });
      } else {
        console.error("Error fetching prices:", response.data.message);
      }
    },
    error: function () {
      console.error("Failed to fetch experience prices.");
    },
  });
}
jQuery(document).ready(function ($) {
  // Call the function to fetch and update prices on page load
  setTimeout(() => {
    fetchExperiencePrices();
  }, 500);
});
function calculateBasePrice({
  availability,
  selectedRateId,
  numberOfParticipants,
}) {
  // 1. Find the matching pricesByRate object
  const ratePricing = availability.pricesByRate.find(
    (item) => item.activityRateId === selectedRateId
  );
  if (!ratePricing) {
    console.warn(`Rate ID ${selectedRateId} not found`);
    return 0;
  }
  // 2. Sum up the base price
  let totalBasePrice = 0;
  ratePricing.pricePerCategoryUnit.forEach((category) => {
    // Multiply category price by the number of participants
    totalBasePrice += category.amount.amount * numberOfParticipants;
  });
  // 3. Return the base price
  return totalBasePrice;
}
function formatDateIntl(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
function renderCustomBokunRatingCircles() {
  const ratingContainers = document.querySelectorAll(
    ".custom-bokun-rating-container"
  );
  ratingContainers.forEach((container) => {
    const ratingCirclesContainer = container.querySelector(
      ".custom-bokun-rating-circles"
    );
    const rating =
      parseFloat(ratingCirclesContainer.getAttribute("data-rating")) || 0;
    const totalCircles =
      parseInt(ratingCirclesContainer.getAttribute("data-total-circles"), 10) ||
      5;
    const reviewCountElement = container.querySelector(
      ".custom-bokun-review-count-value"
    );
    const reviewLink = container.querySelector(".custom-bokun-review-link");
    const numReviews =
      parseInt(reviewCountElement.getAttribute("data-reviews"), 10) || 0;
    const reviewUrl = reviewLink.getAttribute("data-link") || "#";
    const fullCircles = Math.floor(rating);
    const partialCircle = Math.round((rating - fullCircles) * 100); // Partial fill percentage
    ratingCirclesContainer.innerHTML = "";
    for (let i = 0; i < totalCircles; i++) {
      const circle = document.createElement("div");
      circle.classList.add("custom-bokun-rating-circle");
      if (i < fullCircles) {
        circle.style.backgroundColor = "#00AA6C";
      } else if (i === fullCircles && partialCircle > 0) {
        const partialFill = document.createElement("div");
        partialFill.classList.add("custom-bokun-partial-fill");
        partialFill.style.width = `${partialCircle}%`;
        circle.appendChild(partialFill);
      }
      ratingCirclesContainer.appendChild(circle);
    }
    reviewCountElement.textContent = numReviews;
    reviewLink.href = reviewUrl;
  });
}
renderCustomBokunRatingCircles();
