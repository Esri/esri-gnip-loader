function registerValidation() {
  $('#gnipForm').bootstrapValidator().on('success.field.bv', hideSuccessStyling);
  $('#gnipPasswordForm').bootstrapValidator().on('success.field.bv', hideSuccessStyling);
  $('#queryForm').bootstrapValidator().on('success.field.bv', hideSuccessStyling);
  $('#esriForm').bootstrapValidator().on('success.field.bv', hideSuccessStyling);

  function hideSuccessStyling (e, data) {
    // $(e.target)  --> The field element
    // data.bv      --> The BootstrapValidator instance
    // data.field   --> The field name
    // data.element --> The field element
    var validationScope = data.element.attr('data-bv-group') ||
      data.element.closest('form').attr('data-bv-group') ||
      '.form-group';

    var $parent = data.element.parents(validationScope);

    // Remove the has-success class
    $parent.removeClass('has-success');

    // Hide the success icon
    $parent.find('.form-control-feedback[data-bv-icon-for="' + data.field + '"]').hide();
  }
}


function validateDate (value, validator, $field) {
  if (value === '') {
    return true;
  }

  var m = moment(value),
    fieldName = $field.attr('data-validation-name'),
    thisId = '#' + $field.attr('id'),
    otherId = thisId === '#gnipFromDate' ? '#gnipToDate' : '#gnipFromDate';

  if (!m.isValid()) {
    return {
      valid: false,
      message: fieldName + ' could not be parsed into a date!'
    };
  }

  if (m.isAfter(moment())) {
    return {
      valid: false,
      message: fieldName + ' cannot be in the future!'
    };
  }

  // Now compare the two dates.
  var otherDate = moment($(otherId).val()),
    fromDate = thisId === '#gnipFromDate' ? m : otherDate,
    toDate = thisId === '#gnipToDate' ? m : otherDate;

  if (fromDate.isValid && toDate.isValid() &&
    fromDate.isAfter(toDate)) {
    return {
      valid: false,
      message: 'From date cannot be after To date!'
    };
  }

  return true;
}
