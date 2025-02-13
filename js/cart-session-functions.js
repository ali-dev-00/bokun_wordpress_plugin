
var activityTabData = {};
var mainContactDetails = {};
var checkoutTabData = [];
var bookingDetailsPassengers;
var initialCheckoutOptionsResponse = null;
var initialCartResponse = null;
var cartResponse = null;
var checkoutOptionsResponse = null;
jQuery(function ($) {
  function getPreviousDate(dateString) {
    const datePart = dateString.includes('-')
      ? dateString.split('-')[0].trim()
      : dateString.trim();
    const dateObj = new Date(datePart);
    if (isNaN(dateObj)) {
      return dateString;
    }
    dateObj.setDate(dateObj.getDate() - 1);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function storeMainContactDetails(mainContactDetails) {
    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: {
        action: "store_main_contact_details",
        session_id: localStorage.getItem("bokunSessionId"),
        mainContactDetails: JSON.stringify(mainContactDetails),
      },
      success: function (response) {
        if (response.success) {
          console.log("Successfully stored mainContactDetails in transient:", response.data);
        } else {
          console.error("Error storing main contact details.");
        }
      },
      error: function () {
        console.error("Failed to store main contact details.");
      },
    });
  }
  function storeActivityTabData() {
    const sessionId = getOrCreateSessionId();
    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: {
        action: "store_activity_tab_data",
        session_id: sessionId,
        activityTabData: activityTabData,
      },
      dataType: "json",
      success: function (response) {
        if (response.success) {
          console.log("Successfully stored activityTabData:", response);
        } else {
          console.error("Failed to store activity data:", response.data.message);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(`Failed to store activity data: ${textStatus}, ${errorThrown}`);
        console.error("Response Text:", jqXHR.responseText);
      },
    });
  }
  function getStoredData() {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) {
      console.error("❌ Invalid session ID.");
      return;
    }
    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: {
        action: "get_stored_data",
        session_id: sessionId,
      },
      dataType: "json",
      success: function (response) {
        if (response.success && response.data) {
          activityTabData = response.data.activityTabData || {}; // Restore activity data
          mainContactDetails = response.data.mainContactDetails || {}; // Restore contact details

          console.log("✅ Retrieved stored activityTabData:", activityTabData);
          console.log("✅ Retrieved stored mainContactDetails:", mainContactDetails);
        } else {
          console.warn("⚠️ No stored data found.");
        }
      },
      error: function () {
        console.error("❌ Error retrieving stored data.");
      }
    });
  }
  getStoredData();
  function fillForm(moveNext = false) {
    if (!mainContactDetails || !Array.isArray(mainContactDetails)) {
      return;
    }
    const contactData = mainContactDetails.reduce((acc, item) => {
      acc[item.questionId] = item.values[0]; // Store the first value
      return acc;
    }, {});

    $("#contactForm")
      .find("input, textarea, select")
      .each(function () {
        const $field = $(this);
        const questionId = $field.data("question-id");

        if (!questionId || contactData[questionId] === undefined) return;

        const value = contactData[questionId];

        if ($field.is(":checkbox")) {
          $field.prop("checked", value === "1" || value === "true");
        } else if ($field.is(":radio")) {
          $(`input[name="${$field.attr("name")}"][value="${value}"]`).prop("checked", true);
        } else if (questionId === "phoneNumber" && window.iti) {
          window.iti.setNumber(value);
        } else {
          $field.val(value);
        }
      });

    if (moveNext) {
      moveToNextStep();
    }
  }
  function fillActivityTabs() {
    document.querySelectorAll(".custom-checkout-step").forEach((tabElement) => {
      let activityKey = tabElement.getAttribute("data-index"); // Get `data-index` attribute

      if (!activityKey || !activityTabData.hasOwnProperty(activityKey)) return;

      let data = activityTabData[activityKey];
      let keyParts = activityKey.split("_");
      let activityId = keyParts[0];
      let index = keyParts[1];

      console.log(`🔄 Populating data for Activity ${activityKey}`);

      if (data.pickupAnswers && data.pickupAnswers.length > 0) {
        let pickupTitle = data.pickupAnswers[0].values[0];

        const pickupUl = document.getElementById(`pickupOptions_${index}`);
        if (pickupUl) {
          let matchedLi = Array.from(pickupUl.getElementsByTagName("li")).find(
            (li) => li.textContent.trim() === pickupTitle.trim()
          );

          if (matchedLi) {
            $(matchedLi).trigger("click");
            $(matchedLi).addClass("selected");
            $(matchedLi).parent().removeClass("show");
          }
        }
        const pickupInput = document.getElementById(`pickupSearch_${index}`);
        if (pickupInput) {
          pickupInput.value = pickupTitle;
        }

        setTimeout(() => {
          const $roomNumberContainer = $(`#pickupSearch_${index}RoomNumberContainer`);
          const $roomNumberInput = $(`#pickupSearch_${index}RoomNumber`);
          const $whereInput = $(`.customPickupDiv_${index}`);
          const askForRoom = $(`#pickupOptions_${index} li.selected`).data("room-status");

          if (askForRoom !== undefined) {
            $roomNumberContainer.toggle(askForRoom === true);
            $whereInput.toggle(askForRoom !== true);
          }

          if (askForRoom && data.pickRoomNumber) {
            $roomNumberInput.val(data.pickRoomNumber); // Set room number field value
          }

          $whereInput.hide();
        }, 200);
      }

      if (data.dropoffAnswers && data.dropoffAnswers.length > 0) {
        let dropoffTitle = data.dropoffAnswers[0].values[0];

        const dropoffUl = document.getElementById(`dropoffOptions_${index}`);
        if (dropoffUl) {
          let matchedLi = Array.from(dropoffUl.getElementsByTagName("li")).find(
            (li) => li.textContent.trim() === dropoffTitle.trim()
          );

          if (matchedLi) {
            $(matchedLi).trigger("click"); // Trigger click event
            $(matchedLi).addClass("selected"); // Ensure the class is set
            $(matchedLi).parent().removeClass("show"); // Hide dropdown after selection
          }
        }
        const dropoffInput = document.getElementById(`dropoffSearch_${index}`);
        if (dropoffInput) {
          dropoffInput.value = dropoffTitle;
        }
        setTimeout(() => {
          const $roomNumberContainer = $(`#dropoffSearch_${index}RoomNumberContainer`);
          const $roomNumberInput = $(`#dropoffSearch_${index}RoomNumber`);
          const $whereInput = $(`.customDropoffDiv_${index}`);
          const askForRoom = $(`#dropoffOptions_${index} li.selected`).data("room-status");

          if (askForRoom !== undefined) {
            $roomNumberContainer.toggle(askForRoom === true);
            $whereInput.toggle(askForRoom !== true);
          }

          if (askForRoom && data.dropoffRoomNumber) {
            $roomNumberInput.val(data.dropoffRoomNumber); // Set room number field value
          }

          $whereInput.hide();
        }, 200);
      }
      if (data.answers && data.answers.length > 0) {
        data.answers.forEach(function (answer) {
          var inputEl = tabElement.querySelector(`[data-question-id="${answer.questionId}"]`);
          if (inputEl && answer.values.length > 0) {
            inputEl.value = answer.values[0];
          }
        });
      }

      if (data.passengers && data.passengers.length > 0) {
        data.passengers.forEach(function (passenger, passengerIndex) {
          if (passenger.passengerDetails && passenger.passengerDetails.length > 0) {
            passenger.passengerDetails.forEach(function (detail) {
              var inputSelector = `[data-pricing-category-id="${passenger.pricingCategoryId}"][data-booking-id="${passenger.bookingId}"][data-question-id="${detail.questionId}"]`;
              var passengerInput = tabElement.querySelector(inputSelector);
              if (passengerInput && detail.values.length > 0) {
                passengerInput.value = detail.values[0];
              }
            });
          }
        });
      }
    });
  }

  function formatDateToISO(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function formatCustomDateToISO(dateString) {
    const [_, monthName, day, year] = dateString.match(
      /^[A-Za-z]+,\s(\w+)\s(\d+)\s(\d+)/
    );
    const monthMap = {
      January: "01",
      February: "02",
      March: "03",
      April: "04",
      May: "05",
      June: "06",
      July: "07",
      August: "08",
      September: "09",
      October: "10",
      November: "11",
      December: "12",
    };
    const month = monthMap[monthName];
    const dayPadded = String(day).padStart(2, "0");
    return `${year}-${month}-${dayPadded}`;
  }



  async function handleCheckoutModalApiCalls(
    flag = "add",
    productConfirmationCode = null,
    bookableExtras = null,
    handleExtrasSection = false
  ) {
    console.log("API calls made");
    const $button = $(".checkoutAction");
    var activityId = $button.data("activity-id");
    var rateId = $button.data("rate-id");
    var $selectedTimeSlot = $(".custom-bokun-time-slot.selected");
    var passengers = JSON.parse($button.attr("data-pricing-category-id"));
    var date = $button.data("date");
    var startTimeId = $selectedTimeSlot.data("starttimeid");
    date = formatDateToISO(date);

    if (
      (bookableExtras === null && !activityId) ||
      !rateId ||
      !startTimeId ||
      !date ||
      !passengers
    ) {
      console.log(
        "Missing required fields:",
        activityId,
        rateId,
        startTimeId,
        date,
        passengers
      );
    }

    const sessionId = getOrCreateSessionId();
    try {
      let requestDataForCart;
      if (bookableExtras !== null && flag === "add") {
        requestDataForCart = bookableExtras;
        console.log("if condition runs");
      } else if (flag === "add") {
        console.log("else condition runs");
        requestDataForCart = {
          action: "add_to_cart",
          session_id: sessionId,
          activity_id: activityId,
          rate_id: rateId,
          start_time_id: startTimeId,
          date: date,
          passengers: passengers,
          language: localStorage.getItem("language"),
          currency: localStorage.getItem("currency"),
        };
      }

      console.log("requestDataForCart for request", requestDataForCart);

      const addToCart = () =>
        $.ajax({
          url: bokunAjax.ajaxUrl,
          method: "POST",
          data: requestDataForCart,
        });
      const fetchCartDetails = () =>
        $.ajax({
          url: bokunAjax.ajaxUrl,
          method: "POST",
          data: {
            action: "get_cart_details",
            session_id: sessionId,
            language: localStorage.getItem("language"),
            currency: localStorage.getItem("currency"),
          },
        });
      const removeActivityFromCart = () =>
        $.ajax({
          url: bokunAjax.ajaxUrl,
          method: "POST",
          data: {
            action: "remove_activity_form_cart",
            session_id: sessionId,
            product_confirmation_code: productConfirmationCode,
            language: localStorage.getItem("language"),
            currency: localStorage.getItem("currency"),
          },
        });
      const fetchPickupPlaces = () =>
        $.ajax({
          url: bokunAjax.ajaxUrl,
          method: "POST",
          data: {
            action: "checkout_pick_up_places",
            language: localStorage.getItem("language"),
            currency: localStorage.getItem("currency"),
            experience_id: activityId,
          },
        });
      const fetchCheckoutOptions = () =>
        $.ajax({
          url: bokunAjax.ajaxUrl,
          method: "POST",
          data: {
            action: "get_checkout_options",
            session_id: sessionId,
            language: localStorage.getItem("language"),
            currency: localStorage.getItem("currency"),
          },
        });

      let cartApiResponse;
      if (flag === "remove") {
        cartApiResponse = await removeActivityFromCart();
      }
      if (flag === "add") {
        cartApiResponse = await addToCart();
      }
      if (flag === "show") {
        cartApiResponse = await fetchCartDetails();
      }

      if (cartApiResponse.success) {
        const totalPrice = cartApiResponse.data.totalPrice ?? 0;
        if (totalPrice <= 0) {
          const message = cartApiResponse.data.fields.errorResponse ?? "Invalid Data";
          $(".error-message-cart").html(message);
          console.log("Cart is empty, displaying error message.");
          return;
        }

        const pickupPlacesResponse = await fetchPickupPlaces();
        const checkoutOptionsApiResponse = await fetchCheckoutOptions();

        if (!pickupPlacesResponse || !checkoutOptionsApiResponse) {
          console.error("One or more API calls failed.");
          return;
        }

        if (initialCartResponse === null && initialCheckoutOptionsResponse === null) {
          initialCartResponse = cartApiResponse;
          initialCheckoutOptionsResponse = checkoutOptionsApiResponse;
          cartResponse = cartApiResponse;
          checkoutOptionsResponse = checkoutOptionsApiResponse;
        } else {
          if (flag === "add") {
            // Rearrange `activityBookings` in `cartapiresponse`
            if (
              !arraysMatch(
                initialCartResponse.data.activityBookings,
                cartApiResponse.data.activityBookings,
                "activity.id"
              )
            ) {
              const rearrangedActivityBookings = rearrangeAccordingToInitialResponse(
                initialCartResponse.data.activityBookings,
                cartApiResponse.data.activityBookings,
                "activity.id"
              );
              cartApiResponse.data.activityBookings = rearrangedActivityBookings;
            }
            // Rearrange `activityBookings` in `checkoutoptionsapiresponse`
            if (
              !arraysMatch(
                initialCheckoutOptionsResponse.data.questions.activityBookings,
                checkoutOptionsApiResponse.data.questions.activityBookings,
                "activityId"
              )
            ) {
              const rearrangedActivityBookings = rearrangeAccordingToInitialResponse(
                initialCheckoutOptionsResponse.data.questions.activityBookings,
                checkoutOptionsApiResponse.data.questions.activityBookings,
                "activityId"
              );
              console.log("Rearranged Checkout Activity Bookings:", rearrangedActivityBookings);
              checkoutOptionsApiResponse.data.questions.activityBookings = rearrangedActivityBookings;
            }

            // Rearrange `productinvoices` in `checkoutoptionsapiresponse`
            if (
              !arraysMatch(
                initialCheckoutOptionsResponse.data.options[0].invoice.productInvoices,
                checkoutOptionsApiResponse.data.options[0].invoice.productInvoices,
                "product.id"
              )
            ) {
              const rearrangedProductInvoices = rearrangeAccordingToInitialResponse(
                initialCheckoutOptionsResponse.data.options[0].invoice.productInvoices,
                checkoutOptionsApiResponse.data.options[0].invoice.productInvoices,
                "product.id"
              );
              console.log("Rearranged Product Invoices:", rearrangedProductInvoices);
              checkoutOptionsApiResponse.data.options[0].invoice.productInvoices = rearrangedProductInvoices;


            } else {

              initialCartResponse = JSON.parse(JSON.stringify(cartApiResponse));
              initialCheckoutOptionsResponse = JSON.parse(JSON.stringify(checkoutOptionsApiResponse));
            }

            // // Rearrange `productinvoices` in `cartApiresponse`
            // if (
            //   !arraysMatch(
            //     initialCartResponse.customerInvoice.productInvoices,
            //     checkoutOptionsApiResponse.customerInvoice.productInvoices,
            //     "product.id"
            //   )
            // ) {
            //   const rearrangedProductInvoices = rearrangeAccordingToInitialResponse(
            //     initialCartResponse.customerInvoice.productInvoices,
            //     checkoutOptionsApiResponse.customerInvoice.productInvoices,
            //     "product.id"
            //   );
            //   console.log("Rearranged Product Invoices:", rearrangedProductInvoices);
            //   checkoutOptionsApiResponse.data.options[0].invoice.productInvoices = rearrangedProductInvoices;


            // } else {

            //   initialCartResponse = JSON.parse(JSON.stringify(cartApiResponse));
            //   initialCheckoutOptionsResponse = JSON.parse(JSON.stringify(checkoutOptionsApiResponse));
            // }

            cartResponse = cartApiResponse;
            checkoutOptionsResponse = checkoutOptionsApiResponse;

            initialCartResponse = JSON.parse(JSON.stringify(cartApiResponse));
            initialCheckoutOptionsResponse = JSON.parse(JSON.stringify(checkoutOptionsApiResponse));
          }
        }

        if (handleExtrasSection) {
          checkoutModalRightSection(checkoutOptionsResponse, cartResponse);
        } else {
          handleCheckoutModal(
            pickupPlacesResponse,
            checkoutOptionsResponse,
            cartResponse
          );
          $(".custom-checkout-modal-overlay").css("display", "flex");
          $(".custom-bokun-modal-content").hide();
          $("body").css("overflow", "hidden");
        }

        handleExtras(cartResponse);
        fillActivityTabs();

        const activityBookings =
          checkoutOptionsResponse.data.questions.activityBookings;
        bookingDetailsPassengers = activityBookings;
      } else {
        console.error("Add to cart failed.", cartResponse);
      }
    } catch (error) {
      console.error("An error occurred during API calls:", error);
    }
  }

  function arraysMatch(array1, array2, key) {
    if (array1.length !== array2.length) return false;
    return array1.every((item, index) => getNestedKey(item, key) === getNestedKey(array2[index], key));
  }

  function rearrangeAccordingToInitialResponse(initialArray, currentArray, key) {
    const currentArrayMap = new Map(currentArray.map((item) => [getNestedKey(item, key), item]));

    const rearrangedArray = initialArray
      .map((initialItem) => currentArrayMap.get(getNestedKey(initialItem, key)))
      .filter(Boolean);

    const newItems = currentArray.filter(
      (item) => !initialArray.some((initialItem) => getNestedKey(initialItem, key) === getNestedKey(item, key))
    );

    return [...rearrangedArray, ...newItems];
  }

  function getNestedKey(obj, key) {
    return key.split('.').reduce((acc, part) => acc && acc[part], obj);
  }


  function handleExtras(cartResponse) {
    console.log("Loop running for extras...");
    const activityList = cartResponse.data.activityBookings;

    activityList.forEach((item, index) => {
      const activityId = item?.activity?.id;
      const rateId = item?.rate?.id;
      const productConfirmationCode = item.productConfirmationCode;
      const rate = item.rate;
      var bookingType = rate?.pricedPerPerson ? "SINGLE_PERSON" : "GROUP";
      var maxPerBookingForPerPerson = item.pricingCategoryBookings.length;
      var validatedMaxPerBooking = bookingType === "GROUP" ? 1 : maxPerBookingForPerPerson;
      if (!activityId || !rateId) {
        console.warn("Activity or rate ID is missing:", item);
        return;
      }
      $.ajax({
        url: bokunAjax.ajaxUrl,
        method: "POST",
        data: {
          action: "fetch_experience_price_list",
          experience_id: activityId,
          currency: localStorage.getItem("currency"),
        },
        success: function (priceResponse) {
          if (priceResponse) {
            $.ajax({
              url: bokunAjax.ajaxUrl,
              method: "POST",
              data: {
                action: "fetch_experience_details_v2",
                experience_id: activityId,
                currency: localStorage.getItem("currency"),
                language: localStorage.getItem("language"),
              },
              success: function (detailsResponse) {
                const bookableExtras =
                  detailsResponse.data.bookableExtras || [];
                const matchingRate =
                  priceResponse.data.pricesByDateRange?.[0]?.rates.find(
                    (rate) => rate.rateId === rateId
                  );

                console.log("matchingRate", matchingRate);
                if (!matchingRate) {
                  console.warn(`No matching rate found for rateId: ${rateId}`);
                  return;
                }
                const extrasHTML = bookableExtras
                  .map((extra, extraIndex) => {
                    const {
                      id: extraId,
                      title,
                      information,
                      price,
                      photo,
                    } = extra;
                    const amount = price || 0;
                    if (amount === 0) {
                      return;
                    }
                    const currency = localStorage.getItem("currency") || "AED";
                    const imageUrl = photo?.originalUrl || null;
                    const rates = detailsResponse?.data?.rates.map((rate) => {
                      const detailRateId = rate.id;
                      if (rateId === detailRateId) {
                        const extraConfigs = rate?.extraConfigs.map((config) => {
                          if (config.pricedPerPerson === false) {
                            bookingType = "GROUP";
                            validatedMaxPerBooking = 1;
                            console.log("pricedPerPerson", config.pricedPerPerson);
                          }
                        })
                      } else {
                        console.log("rate id did not match")
                      }
                    });
                    const existingExtra = item.extraBookings.find(
                      (e) => e.extra.id === extraId
                    );
                    const initialQuantity = existingExtra
                      ? existingExtra.unitCount
                      : 0;
                    console.log("booking type", bookingType);

                    if (bookingType === "SINGLE_PERSON") {
                      const checkboxContainerId = `checkboxContainer_${activityId}_${extraId}`;
                      console.log("passengercheckboxes", item.pricingCategoryBookings);
                      const passengerCheckboxes = item.pricingCategoryBookings
                        .map(
                          (passenger, i) =>
                            `<label>
                                  <input 
                                    type="checkbox" 
                                    class="extra-checkbox" 
                                    data-extra-id="${extraId}" 
                                    data-passenger-index="${i}" 
                                    id="extraCheckbox_${extraId}_${i}">
                                  Traveller ${i + 1}
                              </label>`
                        )
                        .join("");

                      return `
                          <div class="custom-checkout-experience-box" id="extra_${extraId}_${index}_${extraIndex}">
                              <div class="custom-checkout-experience-header">
                                  ${imageUrl !== null ? `<img src="${imageUrl}" alt="${title}" class="custom-checkout-experience-img">` : ''}
                                  <div class="custom-checkout-experience-details">
                                      <h3>${title}</h3>
                                      <span>${currency} ${amount.toFixed(2)} Per Person</span>
                                  </div>
                              </div>
                              <div id="${checkboxContainerId}" class="custom-traveller-checkboxes">
                                  ${passengerCheckboxes}
                              </div>
                              <p>${information || "Information will be populated later"}</p>
                          </div>`;
                    }
                    else if (bookingType === "GROUP") {
                      return `
                         <div class="custom-bokun-tour-guide-card" id="extra_${index}_${extraIndex}">
                            <div class="custom-bokun-top">
                                <div class="custom-bokun-title">${title}</div>
                                <div class="custom-bokun-price">${currency} <span id="total-price-${index}-${extraIndex}">${amount.toFixed(2)}</span></div>
                            </div>
                            <div class="custom-bokun-quantity-controls">
                                <button class="custom-bokun-quantity-button decrement" data-extra-id="${extraId}" data-index="${index}" data-extra-index="${extraIndex}">-</button>
                                <input type="text" class="custom-bokun-quantity-input" id="quantity-input-${index}-${extraIndex}" value="${initialQuantity}" readonly>
                                <button class="custom-bokun-quantity-button increment" data-extra-id="${extraId}" data-index="${index}" data-extra-index="${extraIndex}">+</button>
                            </div>
                            <p>${information ||
                        "Information will be populated later"
                        }</p>
                        </div>`;
                    }
                  })
                  .join("");
                const extraContainerId = `bookableExtras_${index}`;
                const extrasContainer = document.getElementById(extraContainerId);
                console.log("extras conatiner", extraContainerId);
                if (extrasContainer) {
                  extrasContainer.innerHTML = extrasHTML;

                  bookableExtras.forEach((extra, extraIndex) => {
                    const { id: extraId, price } = extra;
                    if (bookingType === "GROUP")
                      attachQuantityHandlersGroup(
                        `quantity-input-${index}-${extraIndex}`,
                        `total-price-${index}-${extraIndex}`,
                        price || 0,
                        validatedMaxPerBooking,
                        extraId,
                        productConfirmationCode,
                        item
                      );
                    else {
                      const checkboxContainerId = `checkboxContainer_${activityId}_${extraId}`;
                      attachQuantityHandlersSinglePerson(
                        checkboxContainerId,
                        extraContainerId,
                        maxPerBookingForPerPerson,
                        validatedMaxPerBooking,
                        extraId,
                        productConfirmationCode,
                        item
                      );
                    }
                  });
                } else {
                  console.warn(
                    `Container for activity ID ${activityId} not found.`
                  );
                }
              },
              error: function (xhr, status, error) {
                console.error("AJAX error:", status, error);
              },
            });
          } else {
            console.error("Error:", priceResponse.data || "Unknown error");
          }
        },
        error: function (error) {
          console.error(
            "AJAX Error:",
            error.responseJSON?.message || error.statusText || "Request failed"
          );
        },
      });
    });
  }

  function attachQuantityHandlersGroup(
    quantityInputId,
    totalPriceElementId,
    price,
    maxPerBooking,
    extraId,
    productConfirmationCode,
    activityBookingDetails
  ) {
    console.log("max per booking", maxPerBooking);
    const quantityInput = document.getElementById(quantityInputId);
    const totalPriceElement = document.getElementById(totalPriceElementId);
    const containerDiv = quantityInput?.closest(".custom-bokun-tour-guide-card");
    const decrementButton = quantityInput?.parentNode.querySelector(".decrement");
    const incrementButton = quantityInput?.parentNode.querySelector(".increment");
    const minQuantity = 0;
    let isProcessing = false;

    let initialQuantity = activityBookingDetails?.extraBookings.length || 0;

    if (activityBookingDetails?.extraBookings.length > 0) {
      const existingExtra = activityBookingDetails.extraBookings.find(
        (extra) => extra.extra.id === extraId
      );
      initialQuantity = existingExtra?.unitCount || 0;
    }

    let currentQuantity = initialQuantity;

    const passengers = activityBookingDetails.pricingCategoryBookings.map(
      (passenger) => ({
        pricingCategoryId: passenger.pricingCategoryId,
        groupSize: passenger.pricingCategory?.groupSize || 1,
      })
    );

    const validatedMaxPerBooking = maxPerBooking;
    console.log("max per booking from group", validatedMaxPerBooking)
    function toggleButtons(disable = false) {
      incrementButton.disabled = disable || currentQuantity >= validatedMaxPerBooking;
      decrementButton.disabled = disable || currentQuantity <= minQuantity;
    }

    function updatePrice() {
      if (totalPriceElement) {
        totalPriceElement.textContent = price.toFixed(2);
      }
      toggleButtons();
    }

    async function updatePassengers(quantity) {
      if (isProcessing) return;
      isProcessing = true;
      toggleButtons(true); // Disable both buttons during API call

      try {
        await removePreviousActivity(productConfirmationCode);

        const extras =
          quantity > 0
            ? [{ extraId, unitCount: quantity }]
            : [];

        const requestDataForCart = {
          action: "add_to_cart",
          session_id: getOrCreateSessionId(),
          activity_id: activityBookingDetails.activity.id,
          rate_id: activityBookingDetails.rate.id,
          start_time_id: activityBookingDetails.startTime.id,
          date: formatCustomDateToISO(activityBookingDetails.dateString),
          passengers,
          ...(extras.length > 0 && { extras }), // Only include extras if quantity > 0
          language: localStorage.getItem("language"),
          currency: localStorage.getItem("currency"),
        };

        await handleCheckoutModalApiCalls("add", null, requestDataForCart, true);
      } catch (error) {
        console.error("Error processing passengers:", error);
      } finally {
        setTimeout(() => {
          isProcessing = false;
          toggleButtons(false); // Enable buttons after API call completes
        }, 500);
      }
    }

    incrementButton?.addEventListener("click", async () => {
      if (isProcessing || currentQuantity >= validatedMaxPerBooking) return;
      currentQuantity++;
      quantityInput.value = currentQuantity;
      updatePrice();
      await updatePassengers(currentQuantity);
    });

    decrementButton?.addEventListener("click", async () => {
      if (isProcessing || currentQuantity <= minQuantity) return;
      currentQuantity--;
      quantityInput.value = currentQuantity;
      updatePrice();
      await updatePassengers(currentQuantity);
    });

    function setInitialValues() {
      if (quantityInput) quantityInput.value = currentQuantity;
      if (totalPriceElement) totalPriceElement.textContent = price.toFixed(2);
      toggleButtons();
    }

    setInitialValues();
  }

  function attachQuantityHandlersSinglePerson(
    checkboxContainerId,
    parentContainerId,
    maxPerBooking,
    validatedMaxPerBooking,
    extraId,
    productConfirmationCode,
    activityBookingDetails
  ) {
    const parentContainer = document.getElementById(parentContainerId);
    const extrasContainer = document.getElementById(checkboxContainerId);
    if (!extrasContainer) {
      console.error(`Checkbox container with ID ${extrasContainer} not found.`);
      return;
    }
    console.log("Checkbox container:", extrasContainer);

    const checkboxes = extrasContainer.querySelectorAll('input[type="checkbox"]');
    const checkedExtras = new Map();
    let isProcessing = false;

    // Initialize checked extras map
    activityBookingDetails.pricingCategoryBookings.forEach((booking, passengerIndex) => {
      const bookedExtras = new Set(booking.extras?.map((extra) => extra.extra.id) || []);
      checkedExtras.set(passengerIndex, bookedExtras);
    });

    function setCheckboxesState(disabled) {
      extrasContainer.classList.toggle('disabled', disabled);
      checkboxes.forEach(cb => cb.disabled = disabled);
      const parentContainerCheckboxes = parentContainer.querySelectorAll('input[type="checkbox"]');
      parentContainer.classList.toggle('disabled', disabled);
      parentContainerCheckboxes.forEach(cb => cb.disabled = disabled);
    }

    async function processActivityUpdate(clickedCheckbox, passengerIndex, extraIdForCheckbox) {
      if (isProcessing) return;
      isProcessing = true;

      try {
        setCheckboxesState(true);

        // Toggle checkedExtras state
        const isChecked = clickedCheckbox.checked;
        if (isChecked) {
          checkedExtras.get(passengerIndex)?.add(extraIdForCheckbox);
        } else {
          checkedExtras.get(passengerIndex)?.delete(extraIdForCheckbox);
        }

        const passengers = activityBookingDetails.pricingCategoryBookings.map((passenger, index) => ({
          pricingCategoryId: passenger.pricingCategoryId,
          groupSize: 1,
          extras: Array.from(checkedExtras.get(index) || []).map(id => ({
            extraId: id,
            unitCount: 1
          }))
        }));

        await removePreviousActivity(productConfirmationCode);

        const requestDataForCart = {
          action: "add_to_cart",
          session_id: getOrCreateSessionId(),
          activity_id: activityBookingDetails.activity.id,
          rate_id: activityBookingDetails.rate.id,
          start_time_id: activityBookingDetails.startTime.id,
          date: formatCustomDateToISO(activityBookingDetails.dateString),
          passengers,
          language: localStorage.getItem("language"),
          currency: localStorage.getItem("currency")
        };

        await handleCheckoutModalApiCalls("add", null, requestDataForCart, true);

      } catch (error) {
        console.error("Error processing activity update:", error);
        clickedCheckbox.checked = !clickedCheckbox.checked; // Revert if error occurs
      } finally {
        setTimeout(() => {
          setCheckboxesState(false);
          isProcessing = false;
        }, 500);
      }
    }

    checkboxes.forEach((checkbox) => {
      const passengerIndex = parseInt(checkbox.getAttribute("data-passenger-index"), 10);
      const extraIdForCheckbox = parseInt(checkbox.getAttribute("data-extra-id"), 10);

      // Set initial checked state
      checkbox.checked = checkedExtras.get(passengerIndex)?.has(extraIdForCheckbox) || false;

      checkbox.addEventListener("click", async (event) => {
        if (isProcessing) {
          event.preventDefault();
          return;
        }

        await processActivityUpdate(checkbox, passengerIndex, extraIdForCheckbox);
      });
    });

    return () => {
      checkboxes.forEach(checkbox => {
        checkbox.removeEventListener("click", processActivityUpdate);
      });
    };
  }


  async function removePreviousActivity(productConfirmationCode) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: bokunAjax.ajaxUrl,
        method: "POST",
        data: {
          action: "remove_activity_form_cart",
          session_id: getOrCreateSessionId(),
          product_confirmation_code: productConfirmationCode,
          language: localStorage.getItem("language"),
          currency: localStorage.getItem("currency"),
        },
        success: (response) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.data.message));
          }
        },
        error: (xhr, status, error) => {
          reject(new Error(error));
        },
      });
    });
  }

  function checkoutModalRightSection(checkoutOptionsResponse, cartResponse) {
    const rightSection = $(".custom-checkout-right-section");
    const rightSectionContent = `
    <div class="custom-checkout-promo-box">
    ${checkoutOptionsResponse.data.options[0].invoice.productInvoices
        .map((invoice) => {
          const matchingBooking = cartResponse.data.activityBookings.find(
            (booking) =>
              booking.productConfirmationCode === invoice.productConfirmationCode
          );

          const pickupType = matchingBooking?.rate.pickupPricingType || "N/A";
          const dropoffType = matchingBooking?.rate.dropoffPricingType || "N/A";
          const lineItems = invoice.lineItems;

          const passengers =
            matchingBooking?.pricingCategoryBookings?.length || 0;
          const extrasCount =
            lineItems?.filter((item) => item.extraId)?.length || 0;

          console.log("Travellers length:", passengers, lineItems);
          console.log("Extras count:", extrasCount);
          const lineItemsContent =
            lineItems && lineItems.length > 0
              ? lineItems
                .map(
                  (item) =>
                    `
                      <div class="custom-checkout-info-row">
                          <span>${item.title} × ${item.people || item.quantity
                    }</span>
                          <span class="info-price">${item.totalAsText}</span>
                      </div>
                    `
                )
                .join("")
              : `
              <div class="custom-checkout-info-row">
                  <span>Travellers (${passengers})</span>
                  <span class="info-price">${invoice.totalAsText}</span>
              </div>
            `;
          return `
          <div class="custom-checkout-promo-item" data-product-code="${invoice.productConfirmationCode
            }">
            <div class="custom-checkout-promo-header">
                <h3>${invoice.product.title}</h3>
                <span class="custom-checkout-promo-price">${invoice.totalAsText
            }</span>
                <button class="custom-checkout-close-icon">&times;</button>
            </div>
            <p class="custom-checkout-promo-date">${invoice.dates}</p>
            <a href="#" class="custom-checkout-promo-showmore" id="showMoreLink">Show more</a>
            <div class="custom-checkout-expanded-content" id="expandedContent">
                ${lineItemsContent}
                <div class="custom-checkout-info-row">
                    <span>Pick-up</span>
                    <span class="info-value">${pickupType === "INCLUDED_IN_PRICE"
              ? "Included"
              : "Not Included"
            }</span>
                </div>
                <div class="custom-checkout-info-row">
                    <span>Drop-off</span>
                    <span class="info-value">${dropoffType === "INCLUDED_IN_PRICE"
              ? "Included"
              : "Not Included"
            }</span>
                </div>
            </div>
            <hr>
          </div>
        `;
        })
        .join("")}
    
        <div class="custom-checkout-promo-code">
            <label for="promo">Promo Code</label>
            <div class="custom-checkout-promo-input">
                <input type="text" id="promo" placeholder="Enter code">
                <button id="apply-promo" disabled>Apply</button>
            </div>
            <div class="promo-code-error"></div>
        </div>
        <hr>
        <div class="custom-checkout-promo-total">
            <p>Items <span>${checkoutOptionsResponse.data.options[0].formattedAmount
      }</span></p>
            <p><strong>Total (AED)</strong> <span class="custom-checkout-total-price">${checkoutOptionsResponse.data.options[0].formattedAmount
      }</span>
            </p>
        </div>
    </div>
`;
    rightSection.html(rightSectionContent);
    $("#confirmButton").text(`Reserve and Pay Now ${localStorage.getItem("currency")} ${cartResponse.data.totalPrice}`);
    $(".custom-checkout-right-section").prepend(`
      <div class="custom-checkout-order-summary">
          <span>Order Summary <span class="summary-price">${checkoutOptionsResponse.data.options[0].formattedAmount}</span></span>
          <button class="custom-checkout-toggle-summary">▼</button>
      </div>
  `);

    // Toggle Right Section and Smoothly Show Promo Box
    $(".custom-checkout-order-summary").on("click", function () {
      $(".custom-checkout-right-section").toggleClass("active");

      if ($(".custom-checkout-right-section").hasClass("active")) {
        $(".custom-checkout-promo-box").fadeIn(300);
      } else {
        $(".custom-checkout-promo-box").fadeOut(300);
      }
    });
    const showMoreLinks = document.querySelectorAll(
      ".custom-checkout-promo-showmore"
    );
    showMoreLinks.forEach((showMoreLink) => {
      const expandedContent = showMoreLink
        .closest(".custom-checkout-promo-item")
        .querySelector(".custom-checkout-expanded-content");
      showMoreLink.addEventListener("click", function (e) {
        e.preventDefault();
        const isVisible = expandedContent.classList.contains("visible");
        if (isVisible) {
          expandedContent.classList.remove("visible");
          expandedContent.style.maxHeight = "0px"; // Collapse content
          showMoreLink.innerText = "Show more";
        } else {
          expandedContent.classList.add("visible");
          expandedContent.style.maxHeight = expandedContent.scrollHeight + "px";
          showMoreLink.innerText = "Show less";
        }
      });
    });


    const $promoInput = $("#promo");
    const $promoApplyButton = $(".custom-checkout-promo-input button");
    $promoInput.on("input", function () {
      const promoCode = $promoInput.val().trim();
      if (promoCode) {
        $promoApplyButton
          .prop("disabled", false)
          .addClass("custom-checkout-active");
      } else {
        $promoApplyButton
          .prop("disabled", true)
          .removeClass("custom-checkout-active");
      }
    });
    const $errorContainer = $(".promo-code-error");

    $promoInput.on("input", function () {
      const promoCode = $promoInput.val().trim();

      if (promoCode) {
        $errorContainer.hide();
      }
    });

    window.fetchCartDetailsAndUpdateBadge();

  }

  $(document).on(
    "click",
    ".custom-checkout-promo-item .custom-checkout-close-icon",
    function () {
      const clickedElement = $(this).closest(".custom-checkout-promo-item");
      const productConfirmationCode = clickedElement.data("product-code");
      if (!productConfirmationCode) {
        console.log("Error: Product Confirmation Code is missing.");
        return;
      }
      clickedElement.prop("disabled", true);
      clickedElement.css("opacity", "0.5");
      handleCheckoutModalApiCalls("remove", productConfirmationCode, null, false)
        .then(() => {
          clickedElement.slideUp(300, function () {
            $(this).remove();
            cartResponse = null;
            checkoutOptionsResponse = null;
            initialCartResponse = null;
            initialCheckoutOptionsResponse = null;
            if ($(".custom-checkout-promo-item").length === 0) {
              $(".custom-checkout-modal-overlay").css("display", "none");
              $("#modal").css("display", "none");
              $("body").css("overflow", "auto");
            }
            if (mainContactDetails !== null) {
              fillForm(false);
            }
          });
        })
        .catch((error) => {
          console.error("API Call Failed:", error);
          clickedElement.prop("disabled", false);
          clickedElement.css("opacity", "1");
        });
    }
  );
  $(document).on("click", "#cartCheckoutBtn", function () {
    const $button = $(this);
    const originalContent = $button.html();
    $button.prop("disabled", true);
    $button.html("Loading...");
    handleCheckoutModalApiCalls("show", null, null, false)
      .then(() => {
        $button.prop("disabled", false);
        $button.html(originalContent);
        if (mainContactDetails !== null) {
          fillForm(false);
        }
      })
      .catch((error) => {
        console.error("API Call Failed:", error);
        $button.prop("disabled", false);
        $button.html(originalContent);
        alert("Something went wrong. Please try again.");
      });
  });
  $(document).on("click", ".checkoutAction", function () {
    const $button = $(this);
    const originalContent = $button.html();
    $button.prop("disabled", true);
    $button.html("Please wait...");
    handleCheckoutModalApiCalls("add", null, null, false)
      .then(() => {

        $button.prop("disabled", false);
        if (mainContactDetails !== null) {
          fillForm(false);
        }
        $button.html(originalContent);
      })
      .catch((error) => {
        console.error("API Call Failed:", error);
        $button.prop("disabled", false);
        $button.html(originalContent);
        alert("Something went wrong. Please try again.");
      });
  });

  $(document).on("click", ".closeModal", function () {
    $(".custom-checkout-modal-overlay").css("display", "none");
    $(".custom-bokun-modal-content").show();
    $("body").css("overflow", "auto");
    checkoutOptionsResponse = null;
    initialCheckoutOptionsResponse = null;
    cartResponse = null;
    initialCartResponse = null;
  });
  $(document).on("click", ".custom-checkout-modal-overlay", function (e) {
    const $overlay = $(".custom-checkout-modal-overlay");
    if (e.target === $overlay[0]) {
      $overlay.css("display", "none");
      $("body").css("overflow", "auto");
    }
  });
  function getOrCreateSessionId() {
    let sessionId = localStorage.getItem("bokunSessionId");
    if (!sessionId) {
      console.log("No sessionId found. Generating a new one...");
      $.ajax({
        url: bokunAjax.ajaxUrl,
        method: "POST",
        data: {
          action: "generate_cart_session",
          language: localStorage.getItem("language"),
          currency: localStorage.getItem("currency"),
        },
        success: function (response) {
          if (response.success) {
            sessionId = response.data.session_id;
            localStorage.setItem("bokunSessionId", sessionId);
            console.log("New sessionId generated:", sessionId);
          } else {
            console.error("Error generating sessionId:", response.data.message);
          }
        },
        error: function (xhr, status, error) {
          console.error("AJAX error:", status, error);
        },
      });
    } else {
      console.log("Existing sessionId found:", sessionId);
    }
    return sessionId;
  }
  function handleCheckoutModal(
    pickupPlacesResponse = null,
    checkoutOptionsResponse = null,
    cartResponse = null
  ) {
    console.log("rendering modal");
    var checkoutExperience =
      checkoutOptionsResponse.data.options[0].invoice.productInvoices;
    console.log("activityBookings", checkoutExperience);
    const progressbar = $("#progressBar");
    const checkoutSteps = `
      ${checkoutOptionsResponse.data.questions.mainContactDetails
        ? `
          <div class="custom-checkout-progress-step-container">
          <div class="custom-checkout-progress-step active" data-step="1">
            <div class="step-count">1</div> <div class="step-description">Contact Details</div>
          </div>
          <div class="custom-checkout-progress-line"></div>
        `
        : ""
      }
      ${checkoutExperience
        .map(
          (experience, index) => `
        <div id="experienceProgress_${index}" data-activity-id="${experience.product.id
            }" class="custom-checkout-progress-step" data-step="${index + 2}">
          <div class="step-count">${index + 2
            }</div> <div class="step-description">${experience.product.title
            }</div>
        </div>
        <div class="custom-checkout-progress-line"></div>
      `
        )
        .join("")}
      <div class="custom-checkout-progress-step" data-step="${checkoutExperience.length + 2
      }">
        <div class="step-count">${checkoutExperience.length + 2
      }</div> <div class="step-description">Refund Terms</div>
      </div>
      <div class="custom-checkout-progress-line"></div>
      <div class="custom-checkout-progress-step" data-step="${checkoutExperience.length + 3
      }">
        <div class="step-count">${checkoutExperience.length + 3
      }</div> <div class="step-description">Review</div>
      </div>
      </div>
    `;
    progressbar.html(checkoutSteps);
    const tabsContent = $("#leftSection");
    const tabPage = `
      ${checkoutOptionsResponse.data.questions.mainContactDetails
        ? `
          <div class="custom-checkout-step" data-step="1">
            <div class="custom-checkout-contact-section">
              <h2>Main Traveller's Contact Details</h2>
              <div class="custom-checkout-divider"></div>
              <form id="contactForm" class="custom-checkout-contact-grid"></form>
            </div>
            <div class="custom-checkout-continue-btn">
              <button id="continueButton">Continue</button>
            </div>
          </div>
        `
        : ""
      }
      ${checkoutExperience.map((experience, index) => {
        // Find the corresponding activity booking for this experience
        const activityBooking =
          checkoutOptionsResponse.data.questions.activityBookings.find(
            (booking) => booking.activityId === experience.product.id
          );

        return ` 
    <div class="custom-checkout-step" data-step="${index + 2}" id="experienceStep_${index}" data-index="${experience.product.id}_${index}" style="display: none;">
          <h2 class="custom-checkout-section-title">Complete your booking</h2>
        <div class="custom-checkout-divider"></div>
      <div class="custom-checkout-booking-card" data-product-booking-id="${experience.productBookingId}">
        <img src="${experience.product.keyPhoto?.originalUrl ||
          "assets/img/default-tour-image.jpg"}" alt="${experience.product.title}" class="custom-checkout-booking-image">
        <div class="custom-checkout-booking-details">
          <h3 class="custom-checkout-booking-title">${experience.product.title}</h3>
          <div class="custom-checkout-booking-info">
            <p><strong>Travellers</strong><br>${experience.lineItems[0].people} Passengers</p>
            <p><strong>Departure</strong><br>${experience.dates} Passengers</p>
          </div>
        </div>
      </div>
     
      <div class="custom-checkout-pickup-dropoff" id="custom-checkout-pickup-dropoff_${index}">
        <div class="custom-checkout-booking-summary" id="addExpSection">
          <h2 class="custom-checkout-section-title">Add to your experience</h2>
          <div class="custom-checkout-divider"></div>
        </div>    
      <div class="custom-checkout-pickup-dropoff-section">
          <!-- Pick-up Section -->
            <div class="custom-pickup-section" id="parentPickupSection_${index}">
                 <h3 class="custom-pickup-title">
                    Pick-up <span class="custom-included-label">Included in price</span>
                </h3>
                <div class="custom-form-group" id="pickupDiv_${index}">
                    <!-- Dynamic dropdown content will be rendered here by JavaScript -->
                </div>
                <span id="pickupAttention_${index}" data-time-id="${experience.dates}"></span>
                <div class="custom-form-group customPickupDiv_${index}" style="margin-top: 15px !important;">
                    <label class="custom-form-label" for="pickupAddress">Where should we pick you up? *</label>
                    <input type="text" class="custom-form-input" id="pickupAddress" placeholder="Enter pick-up location" />
                </div>
            </div>

            <!-- Drop-off Section -->
            <div class="custom-dropoff-section" id="parentDropoffSection_${index}">
                 <h3 class="custom-dropoff-title">
                     Drop-off <span class="custom-included-label">Included in price</span>
                </h3>
                <div class="custom-form-group" id="dropoffDiv_${index}">
                    <!-- Dynamic dropdown content will be rendered here by JavaScript -->
                </div>
                <div class="custom-form-group customDropoffDiv_${index}" style="margin-top: 15px !important;">
                    <label class="custom-form-label" for="dropoffAddress">Where should we drop you off? *</label>
                    <input type="text" class="custom-form-input" id="dropoffAddress" placeholder="Enter drop-off location"  />
                </div>
            </div>
         </div>
      </div>
      <div id="bookableExtras_${index}" data-activity-id="${experience.product.id}"></div>
          <div id="ParticipantFormData_${index}">
         
          ${activityBooking && (activityBooking.questions?.length > 0 || activityBooking.passengers?.some(
            (passenger) => passenger.passengerDetails?.length > 0
          )) ?
            `        
              <h2 class="custom-checkout-section-title">Participants</h2>
              <div class="custom-checkout-divider"></div>
                <div class="custom-checkout-participant-box">

                ${activityBooking && activityBooking.questions.length > 0 ? `

            <div class="custom-checkout-booking-question-box" id="booking-question-box_${index}">
              ${activityBooking.questions
                .map((question) => {
                  let inputType = "text"; // Default to text
                  if (question.dataType === "DATE") inputType = "date";
                  if (question.dataType === "NUMBER") inputType = "number";
                  return `
                    <div class="custom-checkout-participant-inputs">
                      <div class="custom-checkout-form-group">
                        <label for="${question.questionId}_${index}">
                          ${question.label} ${question.required ? "<span>*</span>" : ""}
                      </label>
                      <span class="custom-question-help">${question.help}</span>
                        <input type="${inputType}" 
                          id="${question.questionId}_${index}" 
                          data-question-id="${question.questionId}" 
                          class="activity-question-input"
                          ${question.required ? "required" : ""}
                          placeholder="${question.placeholder || ''}"
                        />
                      </div>
                    </div>`;
                })
                .join("")}
              </div>
              ` : ""
            }
             ${activityBooking &&
              activityBooking.passengers.some(
                (passenger) => passenger.passengerDetails.length > 0
              )
              ? `
  ${activityBooking.passengers
                .map(
                  (passenger, passengerIndex) => `

        <div class="custom-checkout-participant-inputs">
         <h3>Traveller ${passengerIndex + 1} (${passenger.pricingCategoryTitle})</h3>
          <div class="custom-form-child-section">
          ${passenger.passengerDetails
                      .map((detail) => {
                        // ✅ Determine input type based on dataType
                        let inputType = "text"; // Default
                        if (detail.dataType === "DATE") inputType = "date";
                        if (detail.dataType === "NUMBER") inputType = "number";

                        // ✅ Check if input should be a dropdown
                        if (detail.selectFromOptions && detail.answerOptions?.length) {
                          return `
                <div class="custom-checkout-form-group">
                  <label for="${detail.questionId}_${index}_${passengerIndex}">
                    ${detail.label} ${detail.required ? "<span>*</span>" : ""}
                  </label>
                  <select 
                    id="${detail.questionId}_${index}_${passengerIndex}" 
                    data-question-id="${detail.questionId}" 
                    data-pricing-category-id="${passenger.pricingCategoryId}" 
                    data-booking-id="${passenger.bookingId}" 
                    class="passenger-input" 
                    ${detail.required ? "required" : ""}
                  >
                    <option value="">Select ${detail.label}</option>
                    ${detail.answerOptions
                              .map(
                                (option) => `
                        <option value="${option.value}">${option.label}</option>`
                              )
                              .join("")}
                  </select>
                </div>`;
                        } else {
                          // ✅ Render standard input field
                          return `
                <div class="custom-checkout-form-group">
                  <label for="${detail.questionId}_${index}_${passengerIndex}">
                    ${detail.label} ${detail.required ? "<span>*</span>" : ""}
                  </label>
                  <input type="${inputType}" 
                    id="${detail.questionId}_${index}_${passengerIndex}" 
                    data-question-id="${detail.questionId}" 
                    data-pricing-category-id="${passenger.pricingCategoryId}" 
                    data-booking-id="${passenger.bookingId}" 
                    class="passenger-input"
                    ${detail.required ? "required" : ""}
                    ${inputType === "date" ? 'placeholder="YYYY-MM-DD"' : ""}
                  />
                </div>`;
                        }
                      })
                      .join("")}
          </div>
        </div>`
                )
                .join("")}`
              : ""
            }

               </div>
           </div>`
            : ""
          }
                  
          <div class="custom-checkout-continue-btn">
              <button id="continueToStep${index + 3}">Continue</button>
          </div>
      </div>
      </div>
   `;
      })
        .join("")}
      <!-- Refund Terms -->
      <div class="custom-checkout-step" data-step="${checkoutExperience.length + 2
      }" style="display: none;">
       <h2 class="custom-checkout-step-3-section-title">Cancellation policy</h2>
         <div class="custom-checkout-step-3-divider"></div>
         
         <div class="custom-checkout-step-3-refund-box">
             <label class="custom-checkout-step-3-refund-option">
                 <input type="radio" name="refundOption" id="basicRefund" checked>
                  <span class="custom-checkout-step-3-refund-header">
                      <span class="custom-checkout-step-3-refund-title">Basic refund terms</span>
                      <span class="custom-checkout-step-3-refund-price">Included in price</span>
                 </span>
             </label>
             <div class="custom-checkout-step-3-refund-details">
             ${checkoutExperience.map(experience => `
              <h4>${experience.product.title ?? ""}</h4>
              <p><strong>Cancellation policy</strong></p>
              <ul>
                  <li>Fully refundable until ${getPreviousDate(experience.dates)}</li>
                  <li>Non-refundable after ${getPreviousDate(experience.dates)}</li>
              </ul>
            `).join("")}
             </div>
         </div>
         <div class="custom-checkout-step-3-continue-btn">
              <button id="continueToStep${checkoutExperience.length + 3
      }">Continue</button>
         </div>
      </div>
      <!-- Final Review and Confirm -->
      <div class="custom-checkout-step" data-step="${checkoutExperience.length + 3
      }" style="display: none;">
        <h2 class="custom-checkout-step-4-title">You're booking</h2>
        <div class="custom-checkout-step-4-divider"></div>
             <div class="custom-checkout-step-4-booking-summary">
        ${checkoutExperience
        .map(
          (experience) => `
     
            <div class="custom-checkout-step-4-booking-card">
              <img src="${experience.product.keyPhoto.originalUrl}" alt="${experience.product.title
            }" class="custom-checkout-step-4-image">
              <div class="custom-checkout-step-4-details">
                <h3>${experience.product.title}</h3>
                <div class="custom-checkout-step-4-info">
                  <p><strong>Travellers:</strong> ${experience.lineItems[0].people ?? "not found"
            }</p>
                  <p><strong>Price:</strong> ${experience.lineItems[0].totalAsText ?? "not found"
            }</p>
                  <p><strong>Departure:</strong>${experience.dates ?? "not found"}</p>
                </div>
              </div>
            </div>
        `
        ).join("")}
        </div>
        <div class="custom-checkout-promo-code" id="HidePromoCode">
           <label for="promo">Promo Code</label>
           <div class="custom-checkout-promo-input">
               <input type="text" id="promo" placeholder="Enter code">
               <button id="apply-promo" disabled>Apply</button>
           </div>
           <div class="promo-code-error"></div>
        </div>
        <h2 class="custom-checkout-step-4-title">Confirm</h2>
        <div class="custom-checkout-step-4-divider"></div>
        <div class="custom-checkout-step-4-confirmation">
          <label class="custom-checkout-step-4-checkbox">
            <input type="checkbox" id="termsCheckbox">
            I accept the <a href="#" class="custom-checkout-step-4-link">terms and conditions</a>
          </label>
          <label class="custom-checkout-step-4-checkbox">
            <input type="checkbox" id="privacyCheckbox">
            I have read and consent to the <a href="#" class="custom-checkout-step-4-link">privacy policy</a>
          </label>
        </div>
        <small class="booking-warning">
            ⚠️ Booking cannot be processed right now. Please try again later or refresh your page.
        </small>

        <div class="custom-checkout-step-4-button-container">
          <button id="confirmButton" class="custom-checkout-step-4-button" disabled>
          </button>
        </div>
      </div>
    `;
    tabsContent.html(tabPage);

    checkoutModalRightSection(checkoutOptionsResponse, cartResponse);

    const cancellationPolicyContentDiv = $("#cancellationPolicyDiv");
    const cancellationPolicyContent = checkoutExperience
      .map(
        (experience, index) => `
        <h3>${experience.product.title ?? ""}</h3>
        <p><strong>${experience.dates}</strong></p>
        <div style="display: flex; align-items: center; margin-top: 10px;">
            <img src="<?php echo plugin_dir_url(__FILE__) . 'bokun_images/refund.svg'; ?>" 
                alt="Icon" style="width: 20px; height: 20px; margin-right: 8px;" />
            <span><strong>Cancellation policy</strong></span>
        </div>
        <ul style="margin-top: 5px; padding-left: 25px;">
            <li>Fully refundable until ${experience.dates}</li>
            <li>Non-refundable after ${experience.dates}</li>
        </ul>
    `
      )
      .join("");
    cancellationPolicyContentDiv.html(cancellationPolicyContent);
    if (checkoutOptionsResponse.data.questions.mainContactDetails) {
      const form = $("#contactForm");
      form.innerHTML = "";
      function createFormFields(questions) {
        questions.forEach((question) => {
          const formGroup = document.createElement("div");
          formGroup.className = "custom-checkout-form-group";
          if (question.dataType !== "CHECKBOX_TOGGLE") {
            const label = document.createElement("label");
            label.setAttribute("for", question.questionId);
            label.textContent =
              question.label + (question.required ? " *" : "");
            formGroup.appendChild(label);
          }
          if (question.selectFromOptions) {
            // Create a select dropdown
            const select = document.createElement("select");
            select.id = question.questionId;
            select.required = question.required;
            select.setAttribute("data-question-id", question.questionId);
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = `Select ${question.label}`;
            select.appendChild(defaultOption);
            question.answerOptions.forEach((option) => {
              const optionElement = document.createElement("option");
              optionElement.value = option.value;
              optionElement.textContent = option.label;
              select.appendChild(optionElement);
            });
            formGroup.appendChild(select);
          } else if (question.dataType === "SHORT_TEXT") {
            // Create a text input
            const input = document.createElement("input");
            input.type =
              question.dataFormat === "EMAIL_ADDRESS"
                ? "email"
                : question.dataFormat === "PHONE_NUMBER"
                  ? "tel"
                  : "text";
            input.id = question.questionId;
            input.placeholder = question.label;
            input.required = question.required;
            input.setAttribute("data-question-id", question.questionId);
            if (question.questionId === "phoneNumber") {
              input.id = "custom-phone-code-picker"; // Custom ID for phone number input
            }
            formGroup.appendChild(input);
          } else if (question.dataType === "DATE") {
            // Create a date input
            const input = document.createElement("input");
            input.type = "date";
            input.id = question.questionId;
            input.required = question.required;
            input.setAttribute("data-question-id", question.questionId);
            formGroup.appendChild(input);
          } else if (question.dataType === "CHECKBOX_TOGGLE") {
            // Create a container for the checkbox and label
            const checkboxContainer = document.createElement("div");
            checkboxContainer.className = "checkbox-container"; // Add a class for styling
            // Create the checkbox input
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = question.questionId;
            checkbox.required = question.required;
            checkbox.setAttribute("data-question-id", question.questionId);
            // Create the label for the checkbox
            const checkboxLabel = document.createElement("label");
            checkboxLabel.setAttribute("for", question.questionId);
            checkboxLabel.textContent =
              question.label + (question.required ? " *" : "");
            // Append checkbox and label to the container
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(checkboxLabel);
            // Append the container to the form group
            formGroup.appendChild(checkboxContainer);
          }
          form.append(formGroup);
        });
      }
      // Generate fields dynamically
      createFormFields(
        checkoutOptionsResponse.data.questions.mainContactDetails
      );
      const submitButton = document.getElementById("continueButton");
      var formDataArray = [];
      var addedQuestions = new Set();
      submitButton.onclick = function () {
        const form = document.getElementById("contactForm");
        if (!form) {
          console.error("Form element not found!");
          return;
        }
        const inputs = form.querySelectorAll("[data-question-id]");
        formDataArray = [];
        addedQuestions.clear();
        inputs.forEach((input) => {
          const questionId = input.getAttribute("data-question-id");
          let value;
          if (input.id === "custom-phone-code-picker") {
            if (typeof window.iti !== "undefined") {
              value = window.iti.getNumber();
            } else {
              console.error(
                "intlTelInput instance 'iti' is not accessible or not initialized."
              );
              value = input.value; // Fallback to raw input value
            }
          } else if (input.type === "checkbox") {
            value = input.checked ? "1" : "0";
          } else if (input.type === "radio") {
            if (input.checked) {
              value = input.value;
            } else {
              return;
            }
          } else {
            value = input.value;
          }
          if (!addedQuestions.has(questionId)) {
            formDataArray.push({
              questionId: questionId,
              values: [value],
            });
            addedQuestions.add(questionId);
          }
        });
        console.log("Form Data:", formDataArray);
        mainContactDetails = formDataArray;
        storeMainContactDetails(mainContactDetails);
      };
    } else {
      console.log("Main contact details do not exist");
    }
    const pickupPlaces = pickupPlacesResponse?.data?.pickupPlaces || [];

    function initializeDropdowns(
      containerId,
      inputId,
      placeholder,
      options,
      whereInputSelector,
      optionsId,
      spanId
    ) {
      const $container = $(`#${containerId}`);
      $container.html(`
        <input type="text" id="${inputId}" class="custom-form-input" placeholder="${placeholder}" required/>
        <ul id="${optionsId}"  class="custom-dropdown-options">
          ${options
          .map(
            (option) => `
                <li class="custom-pickup-list" data-title="${option.title}" data-id="${option.id}" data-room-status="${option.askForRoomNumber}">${option.title}</li>
              `
          )
          .join("")}
        </ul>
        <div id="${inputId}RoomNumberContainer" class="room-number-container" style="display: none;">
          <label for="${inputId}RoomNumber">Room Number</label>
          <input type="text" id="${inputId}RoomNumber" class="custom-form-input" placeholder="Enter room number" />
        </div>
      `);
      const $input = $(`#${inputId}`);
      const $dropdown = $(`#${optionsId}`);
      const $roomNumberContainer = $(`#${inputId}RoomNumberContainer`);
      const $whereInput = $(whereInputSelector);
      const $timeSpan = $(`#${spanId}`);
      // Show dropdown when input is focused
      $input.on("focus", function () {
        $dropdown.addClass("show");
        showAllOptions();
      });
      // Hide dropdown when input loses focus
      $input.on("blur", function () {
        setTimeout(() => $dropdown.removeClass("show"), 200);
      });
      // Filter dropdown options based on input value
      $input.on("input", function () {
        const filter = $(this).val().toLowerCase();
        $dropdown.find("li").each(function () {
          const text = $(this).text().toLowerCase();
          $(this).toggle(text.includes(filter));
        });
      });
      // Handle option selection
      $dropdown.on("click", ".custom-pickup-list", function () {
        const $selectedOption = $(this);
        if ($selectedOption.hasClass("selected")) {
          // Deselect option
          $input.val("");
          $selectedOption.removeClass("selected");
          showAllOptions();
          $whereInput.show(); // Show manual input if option deselected
          $timeSpan.text(""); // Clear the time span
        } else {
          // Select option
          $input.val($selectedOption.text());
          $dropdown.find("li").removeClass("selected");
          $selectedOption.addClass("selected");
          const askForRoom = $selectedOption.data("room-status");
          $roomNumberContainer.toggle(askForRoom === true);
          $dropdown.removeClass("show");
          $whereInput.hide();
          const dateString = $timeSpan.data("time-id");
          const convertedTime = convertTo24HourTime(dateString);
          if (convertedTime) {
            $timeSpan.text(`Be ready to be picked at ${convertedTime}`);
          }
        }
      });

      function showAllOptions() {
        $dropdown.find("li").show();
      }

      // Function to convert time to 24-hour format
      function convertTo24HourTime(dateString) {
        if (!dateString) return null;
        const dateParts = dateString.match(/(\d+):(\d+)\s(AM|PM)/);
        if (!dateParts) return null;

        let [hours, minutes, period] = [
          Number(dateParts[1]),
          Number(dateParts[2]),
          dateParts[3],
        ];
        if (period === "PM" && hours < 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        const totalMinutes = hours * 60 + minutes - 15;
        if (totalMinutes < 0) {
          hours = 23;
          minutes = 45;
        } else {
          hours = Math.floor(totalMinutes / 60);
          minutes = totalMinutes % 60;
        }
        return `${String(hours).padStart(
          2,
          "0"
        )}:${String(minutes).padStart(2, "0")}`;
      }
    }

    checkoutExperience.forEach((experience, index) => {
      const activityBooking =
        checkoutOptionsResponse.data.questions.activityBookings.find(
          (booking) => booking.activityId === experience.product.id
        );

      console.log("activityBooking", activityBooking);

      const parentPickupDropoffDiv = `#custom-checkout-pickup-dropoff_${index}`;

      if (activityBooking) {
        const { pickupQuestions = [], dropoffQuestions = [], passengers = [], questions = [], bookingId } = activityBooking;

        // ✅ Correctly check if pickup/dropoff exist
        const hasPickup = Array.isArray(pickupQuestions) && pickupQuestions.length > 0;
        const hasDropoff = Array.isArray(dropoffQuestions) && dropoffQuestions.length > 0;
        const hasPassengers = passengers.length > 0;
        const hasActivityQuestions = questions.length > 0;

        console.log("Has Pickup?", hasPickup, "| Has Dropoff?", hasDropoff);
        const parentPickupDiv = $("#parentPickupSection_" + index);
        const parentDropoffDiv = $("#parentDropoffSection_" + index);
        parentPickupDiv
        const pickupDivId = `pickupDiv_${index}`;
        const dropoffDivId = `dropoffDiv_${index}`;
        const pickupInputId = `pickupSearch_${index}`;
        const dropoffInputId = `dropoffSearch_${index}`;
        const pickupWhereInput = `.customPickupDiv_${index}`;
        const dropoffWhereInput = `.customDropoffDiv_${index}`;
        const pickupOptionsId = `pickupOptions_${index}`;
        const dropoffOptionsId = `dropoffOptions_${index}`;
        const activityBookingId = bookingId;
        // ✅ Render pickup ONLY if it exists
        if (hasPickup) {
          console.log("🚀 Rendering Pickup Field...");
          initializeDropdowns(
            pickupDivId,
            pickupInputId,
            "Specify your pick-up location",
            pickupPlaces,
            pickupWhereInput,
            pickupOptionsId,
            `pickupAttention_${index}`
          );
        }
        if (hasDropoff) {
          console.log("🚀 Rendering Dropoff Field...");
          initializeDropdowns(
            dropoffDivId,
            dropoffInputId,
            "Specify your drop-off location",
            pickupPlaces,
            dropoffWhereInput,
            dropoffOptionsId
          );
        }
        if (!hasPickup) {
          parentDropoffDiv.remove();
        }
        if (!hasDropoff) {
          parentDropoffDiv.remove();
        }

        // ❌ Remove parent div if neither pickup nor dropoff exist
        if (!hasPickup && !hasDropoff) {
          console.log("❌ No Pickup or Dropoff - Removing Parent Div");
          $(parentPickupDropoffDiv).remove();
        }

        // ✅ Handle Continue Button Click
        $(`#continueToStep${index + 3}`).on("click", function () {
          const activityIdIndexKey = `${experience.product.id}_${index}`;

          // ✅ Extract Data
          const activityAnswers = hasActivityQuestions
            ? questions
              .map((question) => {
                const inputId = `${question.questionId}_${index}`;
                const inputValue = $(`#${inputId}`).val()?.trim() || "";
                return inputValue ? { questionId: question.questionId, values: [inputValue] } : null;
              })
              .filter(Boolean)
            : undefined;

          const pickupAnswers =
            hasPickup && $(`#pickupSearch_${index}`).val()?.trim()
              ? [{ questionId: "pickupPlaceDescription", values: [$(`#pickupSearch_${index}`).val().trim()] }]
              : undefined;

          const dropoffAnswers =
            hasDropoff && $(`#dropoffSearch_${index}`).val()?.trim()
              ? [{ questionId: "dropoffPlaceDescription", values: [$(`#dropoffSearch_${index}`).val().trim()] }]
              : undefined;

          // ✅ Get room number values **only if required**
          const pickupRoomNumberInput = $(`#pickupSearch_${index}RoomNumber`).val()?.trim();
          const dropoffRoomNumberInput = $(`#dropoffSearch_${index}RoomNumber`).val()?.trim();
          const askForPickupRoom = Boolean($(`#pickupOptions_${index} li.selected`).attr("data-room-status"));
          const askForDropoffRoom = Boolean($(`#dropoffOptions_${index} li.selected`).attr("data-room-status"));

          // ✅ Process Passengers
          const processedPassengers = hasPassengers
            ? passengers.map((passenger, passengerIndex) => {
              const passengerDetails = passenger.passengerDetails
                .map((detail) => {
                  const inputId = `${detail.questionId}_${index}_${passengerIndex}`;
                  const inputValue = $(`#${inputId}`).val()?.trim() || "";
                  return inputValue ? { questionId: detail.questionId, values: [inputValue] } : null;
                })
                .filter(Boolean);

              return {
                pricingCategoryId: passenger.pricingCategoryId,
                bookingId: passenger.bookingId,
                ...(passengerDetails.length > 0 && { passengerDetails }),
              };
            })
            : undefined;

          // ✅ Store activity data
          activityTabData = activityTabData || {};
          activityTabData[activityIdIndexKey] = {
            ...(activityAnswers && { answers: activityAnswers }),
            ...(pickupAnswers && { pickupAnswers }),
            ...(askForPickupRoom && pickupRoomNumberInput && { pickRoomNumber: pickupRoomNumberInput }),
            ...(dropoffAnswers && { dropoffAnswers }),
            ...(askForDropoffRoom && dropoffRoomNumberInput && { dropoffRoomNumber: dropoffRoomNumberInput }),
            ...(processedPassengers && { passengers: processedPassengers }),
            ...(activityBookingId && { bookingId: activityBookingId }),
          };
          checkoutTabData = checkoutTabData || {};
          checkoutTabData[activityIdIndexKey] = {
            ...(activityAnswers && { answers: activityAnswers }),
            ...(pickupAnswers && { pickupAnswers }),
            ...(askForPickupRoom && pickupRoomNumberInput && { pickRoomNumber: pickupRoomNumberInput }),
            ...(dropoffAnswers && { dropoffAnswers }),
            ...(askForDropoffRoom && dropoffRoomNumberInput && { dropoffRoomNumber: dropoffRoomNumberInput }),
            ...(processedPassengers && { passengers: processedPassengers }),
            ...(activityBookingId && { bookingId: activityBookingId }),
          };


          storeActivityTabData();
        });
      }
    });


    // Console log all stored activities' data
    console.log("All activities data:", activityTabData);

    attactCheckoutModalFunction(checkoutExperience);
    const footerLinks = document.querySelectorAll(
      ".custom-checkout-footer-link"
    );
    const contentContainer = document.getElementById("contentContainer");
    const contentSections = document.querySelectorAll(".content-section");
    footerLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("footerlinks");
        const targetId = link.getAttribute("data-target");
        const targetContent = document.getElementById(targetId);
        if (targetContent.style.display === "block") {
          targetContent.style.display = "none";
          contentContainer.style.display = "none";
        } else {
          contentSections.forEach((section) => {
            section.style.display = "none";
          });
          targetContent.style.display = "block";
          contentContainer.style.display = "block";
        }
      });
    });

    const firstCartActivity = cartResponse.data.activityBookings[0] ?? "";
    const activityOptionsResponse =
      checkoutOptionsResponse.data.questions ?? "";
    // console.log("cart and checkout options response:", firstCartActivity, activityOptionsResponse);

    $("#apply-promo").on("click", function () {
      console.log("Apply Promo button clicked!");
      const promoCode = $("#promo").val().trim();
      console.log(promoCode);
      if (!promoCode) {
        alert("Please enter a promo code.");
        return;
      }
      $.ajax({
        url: bokunAjax.ajaxUrl,
        type: "POST",
        data: {
          action: "submit_promo_code",
          session_id: getOrCreateSessionId(),
          promo_code: promoCode,
          language: localStorage.getItem("language"),
          currency: localStorage.getItem("currency"),
        },
        beforeSend: function () {
          console.log("Applying promo code...");
        },
        success: function (response) {
          console.log("API Response:", response);
          const $errorContainer = $(".promo-code-error");
          if (response.success && response.data.fields.reason !== "NOT_FOUND") {
            $(".custom-checkout-total-price").text(
              `AED ${response.data.newTotal}`
            );
            $errorContainer.text("").hide();
          } else {
            const errorMessage =
              response.data.fields.reason === "NOT_FOUND"
                ? "Error: Promo code not found."
                : response.data.message || "An error occurred.";
            console.error("Error applying promo code:", errorMessage);
            $errorContainer.text(errorMessage).show();
          }
        },
        error: function (xhr, status, error) {
          console.error("AJAX request failed:", error);
        },
      });
    });
    fillActivityTabs();
  }
  $(document).on("click", "#confirmButton", async function () {
    var $button = $(this);
    $button.prop("disabled", true).html(`
  
        <span>Processing...</span>
    `);
    try {
      await submitCheckout(
        bookingDetailsPassengers,
      );
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  });

  async function submitCheckout(
    checkoutExperience,
  ) {

    console.log("Activity tab data from submit checkout:", checkoutTabData);
    if (!checkoutTabData) {
      console.log("Checkout tab data is not initialized");
      return;
    }

    const formDataArray = mainContactDetails;
    const activityBookings = checkoutExperience.map((experience, index) => {
      const activityId = experience.activityId;
      const activityKey = `${activityId}_${index}`;
      const activityData = checkoutTabData[activityKey] || {};
      const bookingId = experience.bookingId;
      const pickupAnswers = activityData.pickupAnswers || [];
      const dropoffAnswers = activityData.dropoffAnswers || [];
      const answers = activityData.answers || [];
      const passengers = activityData.passengers || [];
      const activityPassengers = experience.passengers || [];

      const bookingIdTracker = {};

      const updatedPassengers = passengers.map((passenger) => {
        const { pricingCategoryId } = passenger;

        const availableBookings = activityPassengers.filter(
          (actualPassenger) => actualPassenger.pricingCategoryId === pricingCategoryId
        );

        if (availableBookings.length > 0) {
          if (!bookingIdTracker[pricingCategoryId]) {
            bookingIdTracker[pricingCategoryId] = 0;
          }
          const assignedBooking =
            availableBookings[bookingIdTracker[pricingCategoryId] % availableBookings.length];
          const updatedPassenger = { ...passenger, bookingId: assignedBooking.bookingId };
          bookingIdTracker[pricingCategoryId]++;

          return updatedPassenger;
        }
        return passenger;
      });

      console.log("Original passengers:", passengers);
      console.log("Actual activity passengers:", activityPassengers);
      console.log("Updated passengers with correct bookingIds:", updatedPassengers);

      const activityBooking = {
        activityId,
        bookingId,
      };

      if (pickupAnswers.length > 0) {
        activityBooking.pickupAnswers = pickupAnswers;
      }
      if (dropoffAnswers.length > 0) {
        activityBooking.dropoffAnswers = dropoffAnswers;
      }
      if (updatedPassengers.length > 0) {
        activityBooking.passengers = updatedPassengers;
      }
      if (answers.length > 0) {
        activityBooking.answers = answers;
      }

      return activityBooking;
    });

    const filteredActivityBookings = activityBookings.filter(
      (booking) =>
        (booking.pickupAnswers && booking.pickupAnswers.length > 0) ||
        (booking.dropoffAnswers && booking.dropoffAnswers.length > 0) ||
        (booking.passengers && booking.passengers.length > 0) ||
        (booking.answers && booking.answers.length > 0)
    );

    const shoppingCart = {
      uuid: getOrCreateSessionId(),
      bookingAnswers: {
        mainContactDetails: formDataArray,
        activityBookings: filteredActivityBookings,
      },
    };
    console.log("Final Shopping Cart:", shoppingCart);

    $.ajax({
      url: bokunAjax.ajaxUrl,
      method: "POST",
      data: {
        action: "bokun_checkout_submit",
        shoppingCart: shoppingCart,
        language: localStorage.getItem("language"),
        currency: localStorage.getItem("currency"),
      },

      beforeSend: () => {
        console.log("Submitting checkout...");
      },
      success: (response) => {
        console.log("Checkout Success:", response);
        if (response.data?.redirect_url) {
          window.location.href = response.data.redirect_url;
          console.log("Redirecting to:", response.data.redirect_url);
        } else {
          console.error("Redirect URL not found in response:", response);
          $(".booking-warning").attr("style", "display: block !important;");

        }

      },
      error: (error) => {
        console.error("AJAX request failed:", error);
        alert("An error occurred during checkout.");
      },
      complete: () => {
        console.log("Checkout process completed.");
      },
    });
  }
});