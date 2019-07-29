'use strict';
const check = require('check-types');
const date = require('date-and-time');
const express = require('express');
const router = express.Router();
const db_a = require('debug')('employee:db_a')
  , db_b = require('debug')('employee:db_b')
  , db_c = require('debug')('employee:db_c');
 
// NOTE: Since this is const, there are potential issues with multiple
//       requests changing the database at the same time
const DATABASE = [];

// Temporary hack to limit randomization of id's
// this can cause problems if the id's start to be reused
const MAX_RECORDS = 100;


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: validateEmployee
//
//////////////////////////////////////////////////////////////////////////////////////////
function validateEmployee (req, res, callback) {

  var err = true;

  db_c ("---- validateEmployee");
  db_c ("req.method = " + req.method);
  db_c (JSON.stringify(req.body));

  // Check firstName is a string
  if (check.string(req.body.firstName)) {
    db_c ("firstName is a string");
  } else {
    err = false;
    db_c ("firstName is NOT a string");
  }

  // Check lastName is a string
  if (check.string(req.body.lastName)) {
    db_c ("lastName is a string");
  } else {
    err = false;
    db_c ("lastName is NOT a string");
  }

  // Check hireDate is a string
  if (check.string(req.body.hireDate)) {
    db_c ("hireDate is a string");
  } else {
    err = false;
    db_c ("hireDate is NOT a string");
  }

  // Check role is a string
  if (check.string(req.body.role)) {
    db_c ("role is a string");
  } else {
    err = false;
    db_c ("role is NOT a string");
  }

  // Check hireDate Format
  // - hireDate (YYYY-MM-DD format must be in the past)
  if (date.isValid(req.body.hireDate, 'YYYY-MM-DD')) {
    db_c ("hireDate check PASSED");
  } else {
    err = false;
    db_c ("hireDate check FAILED");
  }

  // Check the date is in the past
  const now = new Date();
  const received_date = new Date(date.parse(req.body.hireDate, 'YYYY-MM-DD'));

  if (date.subtract(now, received_date).toMilliseconds() >= 0) {
    db_c ("hireDate-history check PASSED");
  } else {
    err = false;
    db_c ("hireDate-history check FAILED");
  }

  // Check role is one of 
  const valid_roles = ["CEO", "VP", "MANAGER", "LACKEY"];

  if (req.body.role in valid_roles) {
    db_c ("role check PASSED");
  } else {
    err = false;
    db_c ("role check FAILED");
  }

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
      db_c ("ceo_count check PASSED");
    } else {
      err = false;
      db_c ("ceo_count check FAILED");
    }
  }

  callback (err);
}


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: createEmployeeRecord
//
//////////////////////////////////////////////////////////////////////////////////////////
function createEmployeeRecord (req, res, callback) {
  
  validateEmployee (req, res, function (err) {

    if (!err) {

      // // MTV NOTE: You wouldn't want to do this for real
      // //
      // // Calculate the user's ID
      // var id_is_unique = false;
      // var index = 0;
      // while ((id_is_unique == false) && (index < MAX_RECORDS)) {
      //   index = index + 1;  

      //   var id = Math.floor((Math.random() * MAX_RECORDS) + 1).toString();

      //   DATABASE.forEach(element => {
      //     if (element.id == id) {
      //       id_is_unique = false;
      //     }  
      //   });  
      // }

      var id = Math.floor((Math.random() * MAX_RECORDS) + 1).toString();

      var employee = {
        id: id,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        hireDate: req.body.hireDate,
        role: req.body.role
      };

      callback (err, employee)
    } else {
      callback (err, null)
    };
  });
}

function print_employee(employee) {

  db_b ("id : " + employee.id);
  db_b ("firstName : " + employee.firstName);
  db_b ("lastName : " + employee.lastName);
  db_b ("hireDate : " + employee.hireDate);
  db_b ("role : " + employee.role);
}

function remove_item_from_const_array(const_array, item_index) {

  var newArray = [];

  // Copy the original const array, skipping the item to remove
  for (var i = 0; i < const_array.length; i++) {
    if (i != item_index) {
      newArray.push (const_array[i]);
    }
  }

  // Clear the const array
  while (const_array.length) {
    const_array.pop();
  }

  // Refill it
  for (var i = 0; i < newArray.length; i++) {
    const_array.push (newArray[i]);
  }
}


// CREATE
//
// POST http://localhost:3000/api/employees
//
router.post('/', function(req, res) {

  db_a("CREATE : " + req.method + ' ' + req.url);
  db_a("CREATE : " + JSON.stringify(req.body));

  createEmployeeRecord (req, res, function (err, employee) {

    if (!err && employee) {

      // Add the user to the local database object
      DATABASE.push (employee);

      return res.end (JSON.stringify(employee));
    } else {
      return res.end (JSON.stringify(err));        
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

  createEmployeeRecord (req, res, function (err, employee) {

    if (!err && employee) {

      var replace_success = false;

      // Overwrite the default id that was generated 
      employee.id = req.body.id;

      print_employee(employee);
    
      // Replace the current item with the new item
      for (var i = 0; i < DATABASE.length; i++) { 
        var x;
    
        x = DATABASE[i];
    
        if (x['id'] == req.body.id) {
    
          remove_item_from_const_array(DATABASE, i);
          DATABASE.push(employee);
    
          replace_success = true;
          break;
        }
      }
    
      if (replace_success) {
        return res.end (JSON.stringify(employee));
      } else {
        return res.end ('{"success": "false"}\n');
      }
    } else {
      return res.end (JSON.stringify(err));        
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

  for (var i = 0; i < DATABASE.length; i++) { 

    employee = DATABASE[i];

    if (employee['id'] == req.body.id) {
      console.log ("FOUND: " + JSON.stringify(employee));
      err = false;
      break;
    }
  }

  if ((employee != null) && (err == false)) {
    console.log ("GET_BY_ID : " + JSON.stringify(employee));
    return res.end (JSON.stringify(employee));
  } else {
    res.end ('{"success": "false"}\n');
  }

});

// POST http://localhost:3000/api/employees/getbyid
//
  router.post('/getbyid', function(req, res) {

  var err = true;
  var employee = null;

  db_b("GET_BY_IDX : " + req.method + ' ' + req.url);
  db_b("GET_BY_IDX : " + JSON.stringify(req.body));

  for (var i = 0; i < DATABASE.length; i++) { 

    employee = DATABASE[i];

    if (employee['id'] == req.body.id) {
      console.log ("FOUND: " + JSON.stringify(employee));
      err = false;
      break;
    }
  }

  if ((employee != null) && (err == false)) {
    console.log ("GET_BY_IDX : " + JSON.stringify(employee));
    return res.end (JSON.stringify(employee));
  } else {
    res.end ('{"success": "false"}\n');
  }

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

  var err = true;
  var employee = null;

  db_b("DELETE_BY_ID : " + req.method + ' ' + req.url);
  db_b("DELETE_BY_ID : " + JSON.stringify(req.body));

  for (var i = 0; i < DATABASE.length; i++) { 

    employee = DATABASE[i];

    if (employee['id'] == req.body.id) {
      remove_item_from_const_array(DATABASE, i)
      err = false;
      break;
    }
  }

  if (err || (employee == null)) {
    return res.end ('{"success": "false"}\n');
  } else {
    return res.end (JSON.stringify(employee));
  }
});


module.exports = router;
