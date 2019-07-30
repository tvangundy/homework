//
// Error codes that are caused by the server side
//
const ERROR_CODE_NOT_FOUND = {
    "id": "ERROR_CODE_NOT_FOUND",
    "return_json": {
    "status" : "550",
    "message" : "Valid Error Code Not Found id: "
  }
};

exports.SERVER_FAILURE = {
  "id": "SERVER_FAILURE",
    "return_json": {
    "status" : "555",
    "message" : "Internal error - unknown : "
  }
};

//
// Error codes that are caused by the client side
//

const ERROR_CODES = [
    {"id": "default",
      "return_json": {
      "status" : "450",
      "message" : "General usage error"
    }},
    {"id": "MAX_RECORDS_LIMIT_REACHED",
      "return_json": {
      "status" : "556",
      "message" : "Exceeded storage limit.  max_records : "
    }},
    {"id": "EMPLOYEE_NOT_FOUND_USER",
      "return_json": {
      "status" : "475",
      "message" : "Could not find employee with id : "
    }},
    {"id": "FAILED_TO_CREATE_RECORD",
      "return_json": {
      "status" : "552",
      "message" : "Could not find employee and did not throw an error for id : "
    }},
    {"id": "NOT_A_STRING",
      "return_json": {
      "status" : "452",
      "message" : "Not a string in field : "
    }},
    {"id": "INVALID_DATE_FORMAT_DASHES",
      "return_json": {
      "status" : "453",
      "message" : "Invalid date format, should be YYYY-MM-DD.  date: "
    }},
    {"id": "INVALID_DATE_FORMAT",
      "return_json": {
      "status" : "454",
      "message" : "Invalid date format, should be YYYY-MM-DD.  date: "
    }},
    {"id": "INVALID_DATE",
      "return_json": {
      "status" : "455",
      "message" : "Invalid date - Out of Range.  date : "
    }},
    {"id": "INVALID_FUTURE_DATE",
      "return_json": {
      "status" : "456",
      "message" : "Invalid date, it's in the future. date : "
    }},  
    {"id": "INVALID_ROLE",
      "return_json": {
      "status" : "457",
      "message" : "Invalid role.  Valid roles are [CEO | VP | MANAGER | LACKEY]. role: "
    }},
    {"id": "INVALID_NUMBER_OF_CEOS",
      "return_json": {
      "status" : "458",
      "message" : "Too many CEOS : already found - "
    }},
    {"id": "MISSING_FIELD_IN_MESSAGE",
      "return_json": {
      "status" : "459",
      "message" : "Missing field in message : "
    }}
        
  ];


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: lookupErrorCodeByID
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.lookupErrorCodeByID = function (id, callback) {

  var return_value = null;

  for (var i = 0; i < ERROR_CODES.length; i++) {
    if (ERROR_CODES[i].id == id) {
      return_value =  ERROR_CODES[i].return_json;
      break;
    }
  }

  if (!return_value) {
    callback (null);
  } else {
    callback(return_value);
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: createErr
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.createErr = function (error_code, message, callback) {

  exports.lookupErrorCodeByID (error_code, function (err) {
      
    if (err) {
      let newErr = JSON.parse(JSON.stringify(err));
      newErr.message = newErr.message + message;
  
      callback (newErr);
    } else {
      let newErr = JSON.parse(JSON.stringify(errors.ERROR_CODE_NOT_FOUND.return_json));
      newErr.message = newErr.message + message;
      callback (newErr);
    }
  });        
}



