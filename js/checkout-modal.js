var attactCheckoutModalFunction;
jQuery(document).ready(function ($) {
  attactCheckoutModalFunction = function (checkoutExperience) {
    console.log("Checkout Experience:", checkoutExperience);
    const $closeModalBtn = $(".closeModal");
    const $checkoutOverlayDiv = $(".custom-checkout-modal-overlay");
    const $steps = $(".custom-checkout-step");
    const $progressSteps = $(".custom-checkout-progress-step");
    const $continueButton1 = $("#continueButton");
    const $continueButton3 = $(`#continueToStep${checkoutExperience.length + 3}`);
    const $confirmButton = $("#confirmButton");
    const $backButton = $(".custom-checkout-back-button");
    const $termsCheckbox = $("#termsCheckbox");
    const $privacyCheckbox = $("#privacyCheckbox");
    const $promoInput = $("#promo");
    const $promoApplyButton = $("#promoApplyButton");
    let currentStep = 0;
    $closeModalBtn.on("click", function () {
      $checkoutOverlayDiv.css("display", "none");
      $("body").css("overflow", "auto");
    });
    function initializeSteps() {
      $steps.each(function (index) {
        $(this).css("display", index === 0 ? "block" : "none");
      });
      updateProgressBar(0);
    }
    
    initializeSteps();
   
    
    
    
    
    window.moveToNextStep = function() {
      if (currentStep < $steps.length - 1) {
        $steps.eq(currentStep).css("display", "none");
        currentStep++;
        $steps.eq(currentStep).css("display", "block");
        updateProgressBar(currentStep);
      }
    }
    $backButton.on("click", function (e) {
      e.preventDefault();
      // Get the current step dynamically based on the active progress step
      const currentProgressStep = $(
        ".custom-checkout-progress-step.custom-checkout-active"
      ).index();
      console.log("Current Progress Step:", currentProgressStep);
      if (currentProgressStep === 0) {
        // If it's the first step, close the modal and show Bokun content
        console.log("Already at Step 0. Closing modal...");
        $checkoutOverlayDiv.css("display", "none");
        $(".custom-bokun-modal-content").show();
        $("body").css("overflow", "auto");
      } else if (currentStep > 0) {
        $steps.eq(currentStep).css("display", "none");
        currentStep--;
        $steps.eq(currentStep).css("display", "block");
        updateProgressBar(currentStep);// Update progress bar with the previous step
      }
    });
    function updateProgressBar(step) {
      console.log("Progress bar step:", step);
      const totalSteps = $(".custom-checkout-progress-step").length;
      console.log("totalSteps:", totalSteps);
      const progressDegree = ((step + 1) / totalSteps) * 360; // Calculate circular progress degree
      console.log("progressDegree:", progressDegree);
      const $progressFill = $("#progressFill"); // Circle bar fill
      const $progressStepText = $("#progressStepText");
      const $progressSteps = $(".custom-checkout-progress-step"); // Linear progress steps
      // Update the circular progress bar
      $progressFill.css("--progress-degree", `${progressDegree}deg`);
      $progressStepText.text(`${step + 1}`);
      // Update the linear progress bar
      $progressSteps.each(function (index) {
        if (index < step) {
          $(this).addClass("custom-checkout-completed").removeClass("custom-checkout-active");
        } else if (index === step) {
          $(this).addClass("custom-checkout-active").removeClass("custom-checkout-completed");
        } else {
          $(this).removeClass("custom-checkout-active custom-checkout-completed");
        }
      });
      // Prevent skipping to the last step:
      if (step >= totalSteps) {
        console.warn("You are trying to go past the last step.");
        return;
      }
    }
    const checkoutData = {
      contactDetails: {},
      experienceSelection: [],
      participants: [],
      refundOption: "",
    };
    const phoneInput = document.querySelector("#custom-phone-code-picker");
    window.iti = window.intlTelInput(phoneInput, {
      initialCountry: "ae",
      preferredCountries: ["sa", "ae", "us"],
      separateDialCode: true,
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js"
    });
    $continueButton1.on("click", function () {
      const form = $("#contactForm")[0];
      let structuredData = {};

      $(form)
      .find("input, textarea, select")
      .each(function () {
        const questionId = $(this).data("question-id");
        let value = $(this).val(); 
  
        if (questionId) {
          if (questionId === "phoneNumber") {
            value = window.iti.getNumber(); 
          }
          structuredData[questionId] = value;
        }
      });

      
      if (!validatePhoneNumber()) {
        return;
      }
      if (form.checkValidity()) {
        checkoutData.contactDetails = {
          title: $("#title").val(),
          firstName: $("#firstName").val(),
          lastName: $("#lastName").val(),
          email: $("#email").val(),
          phone: getFullPhoneNumber(),
          subscribeToNews: $("#newsCheckbox").is(":checked"),
        };
        moveToNextStep();
      } else {
        form.reportValidity();
      }
    });
    function validatePhoneNumber() {
      const fullPhoneNumber = window.iti.getNumber();
      console.log("Full Phone Number:", fullPhoneNumber);
      if (window.iti.isValidNumber()) {
        console.log("Valid Phone Number:", fullPhoneNumber);
        showPhoneNumberError("");
        return true;
      } else {
        console.log("Invalid Phone Number");
        showPhoneNumberError("Invalid phone number. Please enter a valid number.");
        return false;
      }
    }
    function getFullPhoneNumber() {
      return window.iti.getNumber();
    }
    function showPhoneNumberError(message) {
      const phoneDropdownContainer = phoneInput.closest(".iti--allow-dropdown");
      removePhoneNumberError();
      const errorElement = $("<small class='phone-error text-danger'></small>").text(message);
      $(phoneDropdownContainer).after(errorElement);
    }
    function removePhoneNumberError() {
      $(".phone-error").remove();
    }
    checkoutExperience.forEach((experience, index) => {
      const continueButton = document.getElementById(`continueToStep${index + 3}`);
      continueButton.addEventListener("click", function () {
        // Locate the current experience step container
        const $stepContainer = document.querySelector(`#experienceStep_${index}`);
        const $requiredInputs = $stepContainer.querySelectorAll("input[required]");
        let valid = true;
        // Helper function to validate required fields
        function validateField($field) {
          if ($field.type === "text") {
            if (!$field.value.trim()) {
              $field.classList.add("custom-checkout-input-error");
              valid = false;
            } else {
              $field.classList.remove("custom-checkout-input-error");
            }
          } else if ($field.type === "checkbox") {
            // At least one checkbox in the group must be selected
            const group = $stepContainer.querySelectorAll("input[type='checkbox'][required]");
            const isChecked = Array.from(group).some((checkbox) => checkbox.checked);
            if (!isChecked) {
              group.forEach((checkbox) => checkbox.classList.add("custom-checkout-input-error"));
              valid = false;
            } else {
              group.forEach((checkbox) => checkbox.classList.remove("custom-checkout-input-error"));
            }
          }
        }
        // Validate each required field
        $requiredInputs.forEach(($field) => validateField($field));
        // If valid, proceed to the next step
        if (valid) {
          // Collect participant data
          const firstName = $stepContainer.querySelector(".participantFirstName")?.value.trim();
          const lastName = $stepContainer.querySelector(".participantLastName")?.value.trim();
          if (firstName && lastName) {
            checkoutData.participants.push({
              firstName,
              lastName,
            });
          }
          // Collect selected experiences
          const selectedCheckboxes = $stepContainer.querySelectorAll(".custom-checkout-experience-box input[type='checkbox']:checked");
          selectedCheckboxes.forEach(($checkbox) => {
            const experienceTitle = $checkbox.closest(".custom-checkout-experience-box").querySelector(".custom-checkout-experience-details h3").textContent;
            checkoutData.experienceSelection.push(experienceTitle);
          });
          moveToNextStep(); // Move to the next step
        } else {
          // Focus on the first invalid field
          const firstInvalidField = $stepContainer.querySelector(".custom-checkout-input-error");
          if (firstInvalidField) firstInvalidField.focus();
        }
      });
    });
    $continueButton3.on("click", function () {
      const $selectedOption = $('input[name="refundOption"]:checked');
      if ($selectedOption.length) {
        // Store refund option in checkoutData
        checkoutData.refundOption = $selectedOption
          .closest(".custom-checkout-step-3-refund-option")
          .find(".custom-checkout-step-3-refund-title")
          .text();
        moveToNextStep();
      } else {
        console.log("please select a refund option to proceed");
      }
    });
    // Step 4: Final Step Validation and Confirmation
    function validateStep4() {
      if (
        $termsCheckbox.is(":checked") &&
        $privacyCheckbox.is(":checked")
      ) {
        $confirmButton
          .prop("disabled", false)
          .addClass("custom-checkout-active");
      } else {
        $confirmButton
          .prop("disabled", true)
          .removeClass("custom-checkout-active");
      }
    }
    $termsCheckbox.on("change", validateStep4);
    $privacyCheckbox.on("change", validateStep4);
    $confirmButton.on("click", function () {
      if (!$confirmButton.prop("disabled")) {
        console.log("Final Checkout Data:", checkoutData);
      }
    });
    $promoInput.on("input", function () {
      if ($promoInput.val().trim()) {
        $promoApplyButton.prop("disabled", false).addClass("custom-checkout-active");
      } else {
        $promoApplyButton.prop("disabled", true).removeClass("custom-checkout-active");
      }
    });
  }

});