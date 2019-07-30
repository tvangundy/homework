'use strict';
const utils = require('./utils.js');
const request = require('request');

const check = require('check-types');
const date = require('date-and-time');
const express = require('express');
const router = express.Router();
const db_api_calls = require('debug')('employee:db_api_calls')
  , db_check = require('debug')('employee:db_check')
  , db_create = require('debug')('employee:db_create')
  , db_replace_by_id = require('debug')('employee:db_replace_by_id')
  , db_get_by_id = require('debug')('employee:db_get_by_id')
  , db_getall = require('debug')('employee:db_getall')
  , db_delete_by_id = require('debug')('employee:db_delete_by_id')
  , db_messaging = require('debug')('employee:db_messaging');

// Temporary hack to limit randomization of id's
// this can cause problems if the id's start to be reused
const MAX_RECORDS = 100;
  
const DATABASE = [];

//
// Message Services
//
const MESSAGE_SERVICES = [
  {"url":"https://ron-swanson-quotes.herokuapp.com/v2/quotes",
   "access": "res.body[0]"},
   {"url":"https://icanhazdadjoke.com",
   "access": "res.body.joke"},
   {"url":"https://quotes.rest/qod",
   "access": "res.body.content.quotes[\"quote\"]"}
];

//
// Error codes that are caused by the server side
//
const ERROR_CODE_NOT_FOUND = {
  "id": "ERROR_CODE_NOT_FOUND",
    "return_json": {
    "status" : "550",
    "message" : "Valid Error Code Not Found : "
  }
};

const EMPLOYEE_NOT_FOUND = {
  "id": "EMPLOYEE_NOT_FOUND",
    "return_json": {
    "status" : "551",
    "message" : "Could not find employee and did not throw an error : "
  }

};

const EMPLOYEE_NOT_FOUND_USER = {
  "id": "EMPLOYEE_NOT_FOUND_USER",
    "return_json": {
    "status" : "475",
    "message" : "Could not find employee with id : "
  }

};

const FAILED_TO_CREATE_RECORD = {
  "id": "FAILED_TO_CREATE_RECORD",
    "return_json": {
    "status" : "552",
    "message" : "Internal error - unable to create record : "
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
    {"id": "RECORD_NOT_FOUND",
      "return_json": {
      "status" : "451",
      "message" : "Could not find record : "
    }},
    {"id": "NOT_A_STRING",
      "return_json": {
      "status" : "452",
      "message" : "Not a string in field : "
    }},
    {"id": "INVALID_DATE_FORMAT_DASHES",
      "return_json": {
      "status" : "453",
      "message" : "Invalid date format, should be YYYY-MM-DD : "
    }},
    {"id": "INVALID_DATE_FORMAT",
      "return_json": {
      "status" : "454",
      "message" : "Invalid date format : "
    }},
    {"id": "INVALID_DATE",
      "return_json": {
      "status" : "455",
      "message" : "Invalid date : "
    }},
    {"id": "INVALID_FUTURE_DATE",
      "return_json": {
      "status" : "456",
      "message" : "Invalid date, it's in the future : "
    }},  
    {"id": "INVALID_ROLE",
      "return_json": {
      "status" : "457",
      "message" : "Invalid role : "
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
// Function: get_message_from_service
//
//////////////////////////////////////////////////////////////////////////////////////////
function get_message_from_service (service, callback) { 

  console.log ("get_message_from_service-", service.url);

  if (service.url == "https://quotes.rest/qod") {
    callback (null, "Bypassing service until time expires");
  } else {

    request(service.url, { json: true }, (err, res, body) => {
    
      // db_messaging ("res.body = ", res.body);
  
      if (service.access == "res.body[0]") {
        callback (err, res.body[0]);
      } else if (service.access == "res.body.joke") {
        callback (err, res.body.joke);
      } else {
  
        // db_messaging ("res.body.contents = " + res.body.contents);
  
        if ("error" in res.body && "message" in res.body.error) {
          callback (err, res.body.error.message);
        } else {
          callback (err, res.body.contents.quotes.quote);
        }
      }
    });
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: lookup_error_code_by_id
//
//////////////////////////////////////////////////////////////////////////////////////////
function lookup_error_code_by_id (id, callback) {

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
// Function: create_err
//
//////////////////////////////////////////////////////////////////////////////////////////
function create_err (error_code, message, callback) {

  lookup_error_code_by_id (error_code, function (err) {
      
    if (err) {
      let newErr = JSON.parse(JSON.stringify(err));
      newErr.message = newErr.message + message;
  
      callback (newErr);
    } else {
      callback (ERROR_CODE_NOT_FOUND.return_json);
    }
  });        
}



//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: find_record_by_id
//
//////////////////////////////////////////////////////////////////////////////////////////
function find_record_by_id (const_array, id, callback) {

  var err = null;
  var employee = null;

  for (var i = 0; i < const_array.length; i++) {

    if (const_array[i].id == id) {
      employee = const_array[i];
      break;
    }
  }

  if (employee) {
    callback (err, employee);
  } else {
    create_err ("RECORD_NOT_FOUND", "", function (err) {
      callback (err);
    });
  }  
}


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: validateRequest
//
//////////////////////////////////////////////////////////////////////////////////////////
function validateRequest (req, res, id_only, callback) {

  var err = null;

  // TODO: Check that the req.body is present and valid
  // Check that req.body is available
  // if(isEmpty(req.body)) {
  //   console.log('Object missing');
  // }
  //   if (Object.keys(req.body).length === 0) {
  //     // Do something
  //  }

  var failed_key = null;

  // --- STRING CHECK ---
  // Since we can only process strings, just make sure everything is a string
  for (var key in req.body) {

    if (!failed_key && req.body.hasOwnProperty(key)) {

      // If id_only selected then only check the id field
      if (id_only) {
        if (key == "id") {
          if (check.string(req.body[key])) {
            db_check ("STRING CHECK: passed for id_only check using key " + key); 
          } else {
            failed_key = key;
          }
        }
      } else {
        if (check.string(req.body[key])) {
           db_check ("STRING CHECK: passed for key " + key);
        } else {
          failed_key = key;
        }    
      }
    }
  }

  if (failed_key) {

    // STRING CHECK FAILED
    db_check ("STRING CHECK FAILED: failed for " + failed_key);

    create_err ("NOT_A_STRING", failed_key, function (err) {
      callback (err);
    });

  } else if (id_only) {

      // STRING_CHECK PASSED for id_only checking
      db_check ("STRING CHECK: pass");
      callback (null);
  } else {
   
    // HIREDATE CHECK
    if ("hireDate" in req.body) {
      
      // - hireDate (YYYY-MM-DD format must be in the past)

      var split_date = req.body.hireDate.split('-');
      // NOTE: Might be ok to just let hireDate just be a number, like year only
      //       but i'd think we would want to make sure there were dashes in the
      //       date
      if (split_date.length == 3) {

        if (date.isValid(req.body.hireDate, 'YYYY-MM-DD')) {

          db_check ("HIREDATE DATE CHECK: pass")

          // Check the date is in the past
          const now = new Date();
          const received_date = new Date(date.parse(req.body.hireDate, 'YYYY-MM-DD'));
      
          if (date.subtract(now, received_date).toMilliseconds() >= 0) {
            
            db_check ("HIREDATE DATE CHECK: pass")

            // role
            if ("role" in req.body) {
          
              // Check role is one of 
              const valid_roles = ["CEO", "VP", "MANAGER", "LACKEY"];
          
              if (valid_roles.includes (req.body.role) ) {
          
                db_check ("ROLE CHECK: passed ");

                if (req.body.role == "CEO") {
                  // Do CEO check if the role is CEO and the command is create
                  // Check only one CEO is in the list
                  if ((req.body.role == "CEO") && (req.method == 'POST')) {

                    var ceo_count = 0;
                    for (var i = 0; i < DATABASE.length; i++) {
                      if (DATABASE[i].role == "CEO") {
                        ceo_count = ceo_count + 1;
                      }
                    }
            
                    // Check number of CEOS
                    if (ceo_count == 0) {
                      db_check ("CEO COUNT CHECK: passed ");
                      callback (null);

                    } else {
                      // --- CEO COUNT CHECK FAILED ---
                      db_check ("CEO COUNT CHECK: failed: ceo_count = " + ceo_count.toString());

                      create_err ("INVALID_NUMBER_OF_CEOS", ceo_count.toString(), function (err) {
                        callback (err);
                      });                  
                    }
                  } else {
                    db_check ("CEO COUNT CHECK: passed ");
                    callback (null);
                  }                  
                } else {
                  db_check ("ROLE CHECK: passed ");
                  callback (null);
                }  
              } else {

                // --- ROLE CHECK FAILED ---
                db_check ("ROLE CHECK: failed on " + req.body.role);

                create_err ("INVALID_ROLE", req.body.role, function (err) {
                  callback (err);
                });                  
              }
            } else {

                // --- MISSING ROLE ---
                db_check ("ROLE CHECK: role is missing ");

                create_err ("MISSING_FIELD_IN_MESSAGE", "role", function (err) {
                  callback (err);
                });                  
            }
          } else {
            // --- HIREDATE DATE CHECK FAILED ---
            db_check ("HIREDATE DATE CHECK: failed on " + req.body.hireDate);                      

            create_err ("INVALID_FUTURE_DATE", req.body.hireDate, function (err) {
              callback (err);
            });                          
          }          
        } else {
          // --- HIREDATE FORMAT CHECK FAILED ---
          db_check ("HIREDATE FORMAT CHECK: failed for " + req.body.hireDate);

          create_err ("INVALID_DATE", req.body.hireDate, function (err) {
            callback (err);
          });                          
        }
      } else {
        // --- HIREDATE FORMAT DASHES CHECK FAILED ---
        db_check ("HIREDATE FORMAT DASHES CHECK: failed for " + req.body.hireDate);
    
        create_err ("INVALID_DATE_FORMAT_DASHES", req.body.hireDate, function (err) {
          callback (err);
        });                          
      }
    } else {
      // --- HIREDATE FIELD MISSING ---
      db_check ("HIREDATE FIELD MISSING CHECK: failed for " + req.body.hireDate);

      create_err ("MISSING_FIELD_IN_MESSAGE", "hireDate", function (err) {
        callback (err);
      });                          
    }    
  }
}


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: createEmployeeRecord
//
//////////////////////////////////////////////////////////////////////////////////////////
function createEmployeeRecord (req, res, set_defaults, callback) {
  
  var err = null;

  if (set_defaults) {

    // TODO: Check that id is not already used and return error if it is
    var id = Math.floor((Math.random() * MAX_RECORDS) + 1).toString();

    get_message_from_service (MESSAGE_SERVICES[0], function (err, message1) {  
      get_message_from_service (MESSAGE_SERVICES[1], function (err, message2) {
        get_message_from_service (MESSAGE_SERVICES[2], function (err, message3) {
  
          var employee = {
            id: id,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            hireDate: req.body.hireDate,
            role: req.body.role,
            message1: message1,
            message2: message2,
            message3: message3
          };
      
          // callback (err, null)
          callback (err, employee)
        });
      });
    });    
  
  } else {
    var employee = {
      id: req.body.id,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      hireDate: req.body.hireDate,
      role: req.body.role,
      message1: req.body.message1,
      message2: req.body.message2,
      message3: req.body.message3
    };

    // callback (err, null)
    callback (err, employee)
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// API Functions
//
//////////////////////////////////////////////////////////////////////////////////////////


// CREATE
//
// POST http://localhost:3000/api/employees
//
router.post('/', function(req, res) {

  db_api_calls("CREATE : " + req.method + ' ' + req.url);
  db_api_calls("CREATE : " + JSON.stringify(req.body));

  validateRequest (req, res, false, function (err) {

    if (!err) {

      createEmployeeRecord (req, res, true, function (err, employee) {

        if (!err) {
    
          if (employee) {
              // Add the user to the local database object
            DATABASE.push (employee);
    
            return res.end(utils.db_print_json (db_create, "res.end", employee));
          } else {
            return res.end(utils.db_print_json (db_create, "res.end", FAILED_TO_CREATE_RECORD.return_json));
          }
    
        } else {
          var return_value = "{\"error\" :" + JSON.stringify(err) + "}"
    
          return res.end(utils.db_print_json (db_create, "res.end", return_value));
        }
      });
    } else {
      return res.end(utils.db_print_json (db_create, "res.end", err));
    }
  });

});

// REPLACE_BY_ID
//
// PUT http://localhost:3000/api/employees/:id
//
router.put('/:id', function(req, res) {

  db_api_calls("REPLACE_BY_ID : " + req.method + ' ' + req.url);
  db_api_calls("REPLACE_BY_ID : " + JSON.stringify(req.body));

  validateRequest (req, res, false, function (err) {

    if (!err) {

      createEmployeeRecord (req, res, false, function (err, employee) {

        if (!err) {
          if (employee) {
            // Overwrite the default values that were generated
            employee.id = req.body.id;            
            employee.message1 = req.body.message1;
            employee.message2 = req.body.message2;
            employee.message3 = req.body.message3;
      
            utils.replace_item_in_const_array_by_id (DATABASE, employee, function (err, item) {
      
              if (item) {
                return res.end (utils.db_print_json (db_replace_by_id, "res.end", item));
              } else {
                return res.end (utils.db_print_json (db_replace_by_id, "res.end", EMPLOYEE_NOT_FOUND_USER.return_json));
              }
            });
          } else {
            return res.end(utils.db_print_json (db_replace_by_id, "res.end", FAILED_TO_CREATE_RECORD.return_json));
          }        
        } else {
          return res.end (utils.db_print_json (db_replace_by_id, "res.end", err));        
        }
      });
    } else {
      return res.end(utils.db_print_json (db_replace_by_id, "res.end", err));
    }
  });
});

// GET_BY_ID
//
// DEBUGGING GET_BY_ID
//
// The desired url for getting an employee by id is this,
//
// GET http://localhost:3000/api/employees/:id
//
// The GET version of this command works when called from curl 
// but it does not work when called from index.html in the browser 
// Safari and Chrome fail the same way.
//
// The temporary workaround is to use POST instead
//
// POST http://localhost:3000/api/employees/getbyid
//
// Both url targets are supported below
//            
//

// GET http://localhost:3000/api/employees/:id
//
router.get('/:id', function(req, res) {

  var err = true;
  var employee = null;

  db_api_calls("GET_BY_ID : " + req.method + ' ' + req.url);
  db_api_calls("GET_BY_ID : " + JSON.stringify(req.body));

  validateRequest (req, res, true, function (err) {

    if (!err) {

      find_record_by_id (DATABASE, req.body.id, function (err, employee) {
        if (!err) {
          if (employee) {
            return res.end (utils.db_print_json (db_get_by_id, "res.end", employee));
          } else {
            return res.end(utils.db_print_json (db_get_by_id, "res.end", EMPLOYEE_NOT_FOUND.return_json));
          }
        } else {
          return res.end(utils.db_print_json (db_get_by_id, "res.end", err));
        }
      });
    } else {
      return res.end(utils.db_print_json (db_get_by_id, "res.end", err));
    }
  });
});

// POST http://localhost:3000/api/employees/getbyid
//
router.post('/getbyid', function(req, res) {

  db_api_calls("GET_BY_IDX : " + req.method + ' ' + req.url);
  db_api_calls("GET_BY_IDX : " + JSON.stringify(req.body));

  validateRequest (req, res, true, function (err) {

    if (!err) {

      find_record_by_id (DATABASE, req.body.id, function (err, employee) {
        if (!err) {
          if (employee) {
            return res.end (utils.db_print_json (db_get_by_id, "res.end", employee));
          } else {
            return res.end(utils.db_print_json (db_get_by_id, "res.end", EMPLOYEE_NOT_FOUND.return_json));
          }
        } else {
          return res.end(utils.db_print_json (db_get_by_id, "res.end", err));
        }
      });
    } else {
      return res.end(utils.db_print_json (db_get_by_id, "res.end", err));
    }
  });
});

//
// GET_ALL
//
// GET http://localhost:3000/api/employees
//
router.get('/', function(req, res) {

  db_api_calls("GET_ALL : " + req.method + ' ' + req.url);
  db_api_calls("GET_ALL RCVD: " + JSON.stringify(req.body));
  db_api_calls("GET_ALL SND: " + JSON.stringify(DATABASE));

  return res.send(utils.db_print_json (db_getall, "res.end", DATABASE));

});

// DELETE_BY_ID
//
// DELETE http://localhost:3000/api/employees/:id
//
router.delete('/:id', function(req, res) {

  db_api_calls("DELETE_BY_ID : " + req.method + ' ' + req.url);
  db_api_calls("DELETE_BY_ID : " + JSON.stringify(req.body));

  validateRequest (req, res, true, function (err) {

    if (!err) {

      utils.remove_item_from_const_array_by_id (DATABASE, req.body.id, db_delete_by_id, function (err, employee) {

        if (!err) {
          if (employee) {
            return res.end (utils.db_print_json (db_delete_by_id, "res.end", employee));
          } else {
            return res.end(utils.db_print_json (db_delete_by_id, "res.end", EMPLOYEE_NOT_FOUND_USER.return_json));
          }
        } else {
          return res.end(utils.db_print_json (db_delete_by_id, "res.end", err));
        }
      });
    } else {
      return res.end(utils.db_print_json (db_delete_by_id, "res.end", err));
    }
  });

});


module.exports = router;
