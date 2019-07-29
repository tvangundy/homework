'use strict';
const utils = require('./utils.js');

const check = require('check-types');
const date = require('date-and-time');
const express = require('express');
const router = express.Router();
const db_a = require('debug')('employee:db_a')
  , db_b = require('debug')('employee:db_b')
  , db_check = require('debug')('employee:db_check')
  , db_create = require('debug')('employee:db_create')
  , db_c = require('debug')('employee:db_c');

// Temporary hack to limit randomization of id's
// this can cause problems if the id's start to be reused
const MAX_RECORDS = 100;
  
// NOTE: Since this is const, there are potential issues with multiple
//       requests changing the database at the same time
const DATABASE = [];

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
    {"id": "INVALID_DATE_FORMAT",
      "return_json": {
      "status" : "453",
      "message" : "Invalid date format : "
    }},
    {"id": "INVALID_DATE",
      "return_json": {
      "status" : "454",
      "message" : "Invalid date : "
    }},
    {"id": "INVALID_ROLE",
      "return_json": {
      "status" : "455",
      "message" : "Invalid role : "
    }},
    {"id": "INVALID_NUMBER_OF_CEOS",
      "return_json": {
      "status" : "456",
      "message" : "Too many CEOS : already found - "
    }}
  ];

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: lookup_error_code_by_id_async
//
//////////////////////////////////////////////////////////////////////////////////////////
function lookup_error_code_by_id_async (id, callback) {

  var return_value = null;

  for (var i = 0; i < ERROR_CODES.length; i++) {
    if (ERROR_CODES[i].id == id) {
      return_value =  ERROR_CODES[i].return_json;
      break;
    }
  }

  callback(return_value);
}


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: find_record_by_id
//
//////////////////////////////////////////////////////////////////////////////////////////
function find_record_by_id (const_array, id, callback) {

  lookup_error_code_by_id_async("RECORD_NOT_FOUND", function (err) {

    if (err) {
      var employee = null;
      for (var i = 0; i < const_array.length; i++) {
  
        if (const_array[i].id == id) {
          employee = const_array[i];
          err = null;
          break;
        }
      }
    
      callback (err, employee);
  
    } else {
      callback (ERROR_CODE_NOT_FOUND, null)
    }
  });
}


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: validateRequest
//
//////////////////////////////////////////////////////////////////////////////////////////
function validateRequest (req, res, id_only, callback) {

  var err = null;

  db_b ("---- validateRequest");
  db_b ("req.method = " + req.method);
  db_b (JSON.stringify(req.body));

  // TODO: Check that the req.body is present and valid
  // Check that req.body is available
  // if(isEmpty(req.body)) {
  //   console.log('Object missing');
  // }
//   if (Object.keys(req.body).length === 0) {
//     // Do something
//  }

  lookup_error_code_by_id_async ("NOT_A_STRING", function (err) {
    
    if (err) {

      var error = false;

      // --- STRING CHECK ---
      // Since we can only process strings, just make sure everything is a string
      for (var key in req.body) {

        if (!error && req.body.hasOwnProperty(key)) {

          if (id_only) {
            if ((key == "id") && check.string(req.body[key])) {
                db_check ("STRING CHECK: passed for id_only check using key " + key); 
            }
          } else {
            if (check.string(req.body[key])) {
              db_check ("STRING CHECK: passed for key " + key);
            } else {
              error = true;
  
              let newErr = JSON.parse(JSON.stringify(err));
              newErr.message = newErr.message + key;
  
              err = newErr;
              db_check ("STRING CHECK: failed for " + key);
            }    
          }  
        }
      }
      if (error == false) {
        err = null;
        db_check ("STRING CHECK: pass");
      }

      
      if (!err && !id_only) {

        // --- HIREDATE FORMAT CHECK ---
        lookup_error_code_by_id_async ("INVALID_DATE_FORMAT", function (err) {

          if (err) {

            if ("hireDate" in req.body) {
        
              // - hireDate (YYYY-MM-DD format must be in the past)

              var split_date = req.body.hireDate.split('-');
              // NOTE: Might be ok to just let hireDate just be a number, like year only
              //       but i'd think we would want to make sure there were dashes in the
              //       date
              if (split_date.length == 3) {

                if (date.isValid(req.body.hireDate, 'YYYY-MM-DD')) {
        
                  db_check ("HIREDATE FORMAT CHECK: pass")
  
                  // --- HIREDATE DATE CHECK ---
                  lookup_error_code_by_id_async ("INVALID_DATE", function (err) {
  
                    if (err) {
                      
                      // Check the date is in the past
                      const now = new Date();
                      const received_date = new Date(date.parse(req.body.hireDate, 'YYYY-MM-DD'));
              
                      if (date.subtract(now, received_date).toMilliseconds() >= 0) {
                        
                        db_check ("HIREDATE DATE CHECK: pass")
  
                        // --- ROLE CHECK ---
                        lookup_error_code_by_id_async ("INVALID_ROLE", function (err) {
                          
                          if (err) {
  
                            // role
                            if ("role" in req.body) {
                        
                              // Check role is one of 
                              const valid_roles = ["CEO", "VP", "MANAGER", "LACKEY"];
                      
                              if (valid_roles.includes (req.body.role) ) {
                      
                                db_check ("ROLE CHECK: passed ");
  
                                if (req.body.role == "CEO") {
                                  // --- CEO COUNT CHECK ---
                                  lookup_error_code_by_id_async ("INVALID_NUMBER_OF_CEOS", function (err) {
    
                                    if (err) {
                                      
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
                                          let newErr = JSON.parse(JSON.stringify(err));
    
                                          newErr.message = newErr.message + ceo_count.toString();
                                          err = newErr;
                                          db_check ("CEO COUNT CHECK: failed: ceo_count = " + ceo_count.toString());
                                          callback (newErr);
                                        }
                                      } else {
                                        db_check ("CEO COUNT CHECK: passed ");
                                        callback (null);
                                      }
    
                                    } else {
                                      callback (ERROR_CODE_NOT_FOUND)
                                    }
                                  });
                                } else {
                                  callback (null);
                                }  
                              } else {
                                let newErr = JSON.parse(JSON.stringify(err));
  
                                newErr.message = newErr.message + req.body.role;
  
                                db_check ("ROLE CHECK: failed on " + req.body.role);
                                callback (newErr);
                              }
                            } else {
                              callback (ERROR_CODE_NOT_FOUND);
                            }
                          } else {
                            callback (ERROR_CODE_NOT_FOUND);
                          }
                        });
                      } else {
                        let newErr = JSON.parse(JSON.stringify(err));
                        newErr.message = newErr.message + req.body.hireDate;
                        db_check ("HIREDATE DATE CHECK: failed on " + req.body.hireDate);                      
                        callback (newErr);                    
                        }
                    } else {
                      callback (ERROR_CODE_NOT_FOUND);
                    }
                  });
                  
                } else {
                  let newErr = JSON.parse(JSON.stringify(err));
                  newErr.message = newErr.message + req.body.hireDate;
  
                  db_check ("HIREDATE FORMAT CHECK: failed for " + req.body.hireDate);
  
                  callback (newErr);
                }
              } else {
                let newErr = JSON.parse(JSON.stringify(err));
                newErr.message = newErr.message + req.body.hireDate;

                db_check ("HIREDATE FORMAT CHECK: failed for " + req.body.hireDate);

                callback (newErr);
              }
            } else {
              // TODO: Handle case where the hireDate is not in the body
            }
          } else {
            callback (ERROR_CODE_NOT_FOUND);
          }
        });
      } else if (err) {
        // STRING_CHECK Failed
        callback (err);
      } else {
        // STRING_CHECK for id_only passed
        callback (null);
      }
    
    } else {
      callback (ERROR_CODE_NOT_FOUND)
    }

  });
}


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: createEmployeeRecord
//
//////////////////////////////////////////////////////////////////////////////////////////
function createEmployeeRecord (req, res, callback) {
  
  var err = null;

  var id = Math.floor((Math.random() * MAX_RECORDS) + 1).toString();

  // TODO: Check that id is not already used and return error if it is
  var employee = {
    id: id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    hireDate: req.body.hireDate,
    role: req.body.role
  };

  // callback (err, null)
  callback (err, employee)

}


// CREATE
//
// POST http://localhost:3000/api/employees
//
router.post('/', function(req, res) {

  db_create("CREATE : " + req.method + ' ' + req.url);
  db_create("CREATE : " + JSON.stringify(req.body));

  validateRequest (req, res, false, function (err) {

    if (!err) {

      createEmployeeRecord (req, res, function (err, employee) {

        if (!err) {
    
          if (employee) {
            // Add the user to the local database object
            DATABASE.push (employee);
    
            return res.end(utils.db_print_json (db_create, "res.end", employee));
          } else {
            return res.end(utils.db_print_json (db_create, "res.end", EMPLOYEE_NOT_FOUND));
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

  db_b("REPLACE_BY_ID : " + req.method + ' ' + req.url);
  db_b("REPLACE_BY_ID : " + JSON.stringify(req.body));

  validateRequest (req, res, false, function (err) {

    if (!err) {

      createEmployeeRecord (req, res, function (err, employee) {

        if (!err) {
          if (employee) {
            // Overwrite the default id that was generated 
            employee.id = req.body.id;
      
            utils.print_employee(db_b, employee);
      
            utils.replace_item_in_const_array_by_id (DATABASE, employee, function (err) {
      
              if (!err) {
                return res.end (utils.db_print_json (db_create, "res.end", employee));
              } else {
                return res.end (utils.db_print_json (db_create, "res.end", err));        
              }
            });
          } else {
            return res.end(utils.db_print_json (db_create, "res.end", EMPLOYEE_NOT_FOUND));
          }        
        } else {
          return res.end (utils.db_print_json (db_create, "res.end", err));        
        }
      });
    } else {
      return res.end(utils.db_print_json (db_create, "res.end", err));
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

  db_b("GET_BY_ID : " + req.method + ' ' + req.url);
  db_b("GET_BY_ID : " + JSON.stringify(req.body));

  validateRequest (req, res, true, function (err) {

    if (!err) {

      find_record_by_id (DATABASE, req.body.id, function (err, employee) {
        if (!err) {
          if (employee) {
            return res.end (JSON.stringify(employee));
          } else {
            return res.end(utils.db_print_json (db_create, "res.end", EMPLOYEE_NOT_FOUND));
          }
        } else {
          return res.end(utils.db_print_json (db_create, "res.end", err));
        }
      });
    } else {
      return res.end(utils.db_print_json (db_create, "res.end", err));
    }
  });
});

// POST http://localhost:3000/api/employees/getbyid
//
router.post('/getbyid', function(req, res) {

  db_b("GET_BY_IDX : " + req.method + ' ' + req.url);
  db_b("GET_BY_IDX : " + JSON.stringify(req.body));

  db_b("GET_BY_IDX : calling find_record_by_id");

  validateRequest (req, res, true, function (err) {

    if (!err) {

      find_record_by_id (DATABASE, req.body.id, function (err, employee) {
        if (!err) {
          if (employee) {
            return res.end (JSON.stringify(employee));
          } else {
            return res.end(utils.db_print_json (db_create, "res.end", EMPLOYEE_NOT_FOUND));
          }
        } else {
          return res.end(utils.db_print_json (db_create, "res.end", err));
        }
      });
    } else {
      return res.end(utils.db_print_json (db_create, "res.end", err));
    }
  });
});

//
// GET_ALL
//
// GET http://localhost:3000/api/employees
//
router.get('/', function(req, res) {

  db_a("GET_ALL : " + req.method + ' ' + req.url);
  db_a("GET_ALL RCVD: " + JSON.stringify(req.body));
  db_a("GET_ALL SND: " + JSON.stringify(DATABASE));

  return res.send(JSON.stringify(DATABASE));

});

// DELETE_BY_ID
//
// DELETE http://localhost:3000/api/employees/:id
//
router.delete('/:id', function(req, res) {

  db_b("DELETE_BY_ID : " + req.method + ' ' + req.url);
  db_b("DELETE_BY_ID : " + JSON.stringify(req.body));

  validateRequest (req, res, true, function (err) {

    if (!err) {

      utils.remove_item_from_const_array_by_id (DATABASE, req.body.id, function (err, employee) {

        if (!err) {
          if (employee) {
            return res.end (JSON.stringify(employee));
          } else {
            return res.end(utils.db_print_json (db_create, "res.end", EMPLOYEE_NOT_FOUND));
          }
        } else {
          return res.end(utils.db_print_json (db_create, "res.end", err));
        }
      });
    } else {
      return res.end(utils.db_print_json (db_create, "res.end", err));
    }
  });

});


module.exports = router;
