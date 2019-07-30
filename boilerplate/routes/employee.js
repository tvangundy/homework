'use strict';
const utils = require('./utils.js');
const errors = require('./errors.js');
const messages = require('./messages.js')

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
const MAX_RECORDS = 10;
  
const DATABASE = [];


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: validateRequest
//
//////////////////////////////////////////////////////////////////////////////////////////
function validateRequest (req, res, id_only, callback) {

  var err = null;

  // TODO: Check that the req.body is present and valid
  // const isEmpty = require('lodash.isempty');

  // if(isEmpty(req.body)) {
  //     console.log('Empty Object');
  // }

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

    errors.createErr ("NOT_A_STRING", failed_key, function (err) {
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

                      errors.createErr ("INVALID_NUMBER_OF_CEOS", ceo_count.toString(), function (err) {
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

                errors.createErr ("INVALID_ROLE", req.body.role, function (err) {
                  callback (err);
                });                  
              }
            } else {

                // --- MISSING ROLE ---
                db_check ("ROLE CHECK: role is missing ");

                errors.createErr ("MISSING_FIELD_IN_MESSAGE", "role", function (err) {
                  callback (err);
                });                  
            }
          } else {
            // --- HIREDATE DATE CHECK FAILED ---
            db_check ("HIREDATE DATE CHECK: failed on " + req.body.hireDate);                      

            errors.createErr ("INVALID_FUTURE_DATE", req.body.hireDate, function (err) {
              callback (err);
            });                          
          }          
        } else {
          // --- HIREDATE FORMAT CHECK FAILED ---
          db_check ("HIREDATE FORMAT CHECK: failed for " + req.body.hireDate);

          errors.createErr ("INVALID_DATE", req.body.hireDate, function (err) {
            callback (err);
          });                          
        }
      } else {
        // --- HIREDATE FORMAT DASHES CHECK FAILED ---
        db_check ("HIREDATE FORMAT DASHES CHECK: failed for " + req.body.hireDate);
    
        errors.createErr ("INVALID_DATE_FORMAT_DASHES", req.body.hireDate, function (err) {
          callback (err);
        });                          
      }
    } else {
      // --- HIREDATE FIELD MISSING ---
      db_check ("HIREDATE FIELD MISSING CHECK: failed for " + req.body.hireDate);

      errors.createErr ("MISSING_FIELD_IN_MESSAGE", "hireDate", function (err) {
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

    utils.generateID (DATABASE, MAX_RECORDS, function (err, id) {

      if (!err) {
        messages.getMessageFromService (messages.MESSAGE_SERVICES[0], function (err, message1) {  
          messages.getMessageFromService (messages.MESSAGE_SERVICES[1], function (err, message2) {
            messages.getMessageFromService (messages.MESSAGE_SERVICES[2], function (err, message3) {
      
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
          
              // To induce missing employee errors do
              // callback (err, null)
              callback (err, employee)
            });
          });
        });        
      } else {
        callback (err, null)
      }
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

    // To induce missing employee errors do
    // callback (err, null)
    callback (err, employee)
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: createErrResponse
//
//////////////////////////////////////////////////////////////////////////////////////////
function createErrResponse (res, error_code, message, db_function_name, callback) {

  errors.createErr (error_code, message, function (err) {
    createStatusResponse (res, err, db_function_name, function (response) {
      if (response) {
        callback (response);
      } else {
        var response = {status: 500, statusMessage:errors.SERVER_FAILURE.return_json.message, message:JSON.stringify(errors.SERVER_FAILURE.return_json)};
        callback (response);
      }
    });
  });
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: createStatusResponse
//
//////////////////////////////////////////////////////////////////////////////////////////
function createStatusResponse (res, json_obj, db_function_name, callback) {

  var json_string = JSON.stringify(json_obj);
  var response;

  db_function_name (JSON.stringify(json_obj));

  if (json_obj["status"] && json_obj["message"]) {

    response = {status: Number(json_obj['status']), statusMessage:json_obj['message'], message:JSON.stringify(json_obj['message'])};

    res.statusMessage = response.statusMessage;

    db_function_name (JSON.stringify(response));
  
    callback (response);
  
  } else if (json_obj["message"]) {

    response = {status: 200, statusMessage:json_obj['message'], message:JSON.stringify(json_obj['message'])};
  
    res.statusMessage = response.statusMessage;

    db_function_name (JSON.stringify(response));
  
    callback (response);  
  } else {

    response = {status: 200, statusMessage:null, message:JSON.stringify(json_obj)};

    res.statusMessage = response.statusMessage;

    db_function_name (JSON.stringify(response));

    callback (response);  
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: prepareResponse
//
//////////////////////////////////////////////////////////////////////////////////////////
function prepareResponse (res, json_obj, error_id, extra_message, db_function_name, callback) {

  if (json_obj)
  {
    createStatusResponse (res, json_obj, db_function_name, function (response) {
      if (response) {
        callback (response);
      } else {
        createErrResponse (res, "SERVER_FAILURE", "", db_function_name, function (response) {
          callback (response);
        });
      }
    });
  } else {
    createErrResponse (res, error_id, extra_message, db_function_name, function (response) {
      callback (response);
    });
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

            prepareResponse (res, employee, null, 0, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });
          } else {
            prepareResponse (res, null, "FAILED_TO_CREATE_RECORD", req.body.id, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });
          }
        } else {
          prepareResponse (res, err, null, 0, db_api_calls, function (response) {
            return res.status(response.status).send (response.message);
          });
        }
      });
    } else {
      prepareResponse (res, err, null, 0, db_api_calls, function (response) {
        return res.status(response.status).send (response.message);
      });    
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
      
            utils.replaceItemInArray (DATABASE, employee, function (err, item) {
      
              if (item) {
                prepareResponse (res, item, null, req.body.id, db_api_calls, function (response) {
                  return res.status(response.status).send (response.message);
                });    
              } else {
                prepareResponse (res, null, "EMPLOYEE_NOT_FOUND_USER", req.body.id, db_api_calls, function (response) {
                  return res.status(response.status).send (response.message);
                });    
              }
            });
          } else {
            prepareResponse (res, null, "FAILED_TO_CREATE_RECORD", req.body.id, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });    
          }        
        } else {
          prepareResponse (res, err, null, 0, db_api_calls, function (response) {
            return res.status(response.status).send (response.message);
          });
        }
      });
    } else {
      prepareResponse (res, err, null, 0, db_api_calls, function (response) {
        return res.status(response.status).send (response.message);
      });
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

      utils.findRecordByID (DATABASE, req.body.id, function (err, employee) {
        if (!err) {
          if (employee) {
            prepareResponse (res, employee, null, 0, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });    
          } else {
            prepareResponse (res, null, "FAILED_TO_CREATE_RECORD", req.body.id, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });            
          }
        } else {
          prepareResponse (res, err, null, 0, db_api_calls, function (response) {
            return res.status(response.status).send (response.message);
          });
        }
      });
    } else {
      prepareResponse (res, err, null, 0, db_api_calls, function (response) {
        return res.status(response.status).send (response.message);
      });
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

      utils.findRecordByID (DATABASE, req.body.id, function (err, employee) {
        if (!err) {
          if (employee) {
            prepareResponse (res, employee, null, 0, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });      
          } else {
            prepareResponse (res, null, "FAILED_TO_CREATE_RECORD", req.body.id, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });      
          }
        } else {
          prepareResponse (res, err, null, 0, db_api_calls, function (response) {
            return res.status(response.status).send (response.message);
          });
        }
      });
    } else {
      prepareResponse (res, err, null, 0, db_api_calls, function (response) {
        return res.status(response.status).send (response.message);
      });
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

  prepareResponse (res, DATABASE, null, 0, db_api_calls, function (response) {
    return res.status(response.status).send (response.message);
  });
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

      utils.removeItemFromArray (DATABASE, req.body.id, db_delete_by_id, function (err, employee) {

        if (!err) {
          if (employee) {
            prepareResponse (res, employee, null, 0, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });          
          } else {
            prepareResponse (res, null, "EMPLOYEE_NOT_FOUND_USER", req.body.id, db_api_calls, function (response) {
              return res.status(response.status).send (response.message);
            });
          }
        } else {
          prepareResponse (res, err, null, 0, db_api_calls, function (response) {
            return res.status(response.status).send (response.message);
          });
        }
      });
    } else {
      prepareResponse (res, err, null, 0, db_api_calls, function (response) {
        return res.status(response.status).send (response.message);
      });
    }
  });

});


module.exports = router;
