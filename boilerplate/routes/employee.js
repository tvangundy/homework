// 'use strict';
const express = require('express');
const router = express.Router();
var a = require('debug')('worker:a')
  , b = require('debug')('worker:b');
 
// NOTE: Since this is const, there are potential issues with multiple
//       requests changing the database at the same time
const DATABASE = [];

// Temporary hack to limit randomization of id's
// this can cause problems if the id's start to be reused
const MAX_RECORDS = 100;

function getEmployeeFromRec(req) {
  const employee = {
    id: Math.floor((Math.random() * MAX_RECORDS) + 1).toString(),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    hireDate: req.body.hireDate,
    role: req.body.role
  };
 
  return employee;
}

function print_employee(employee) {

  b ("id : " + employee.id);
  b ("firstName : " + employee.firstName);
  b ("lastName : " + employee.lastName);
  b ("hireDate : " + employee.hireDate);
  b ("role : " + employee.role);
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

  a("CREATE : " + req.method + ' ' + req.url);
  a("CREATE : " + JSON.stringify(req.body));

  let employee = getEmployeeFromRec(req);
    
  var err = false;

  // Add the user to the local database object
  DATABASE.push (employee);

  return res.end (JSON.stringify(employee));

});

// REPLACE_BY_ID
//
// PUT http://localhost:3000/api/employees/:id
//
router.put('/:id', function(req, res) {

  var err = true;

  b("REPLACE_BY_ID : " + req.method + ' ' + req.url);
  b("REPLACE_BY_ID : " + JSON.stringify(req.body));

  // Create a new employee and overwrite the default id assigned
  let employee = getEmployeeFromRec(req);
  employee.id = req.body.id;

  print_employee(employee);

  for (var i = 0; i < DATABASE.length; i++) { 
    var x;

    x = DATABASE[i];

    if (x['id'] == req.body.id) {

      remove_item_from_const_array(DATABASE, i);
      DATABASE.push(employee);

      err = false;
      break;
    }
  }

  if (err) {
    return res.end ('{"success": "false"}\n');
  } else {
    return res.end (JSON.stringify(employee));
  }
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

  // console.log ("GET_BY_ID : " + req.body.id);
  b("GET_BY_ID : " + req.method + ' ' + req.url);
  b("GET_BY_ID : " + JSON.stringify(req.body));

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

  // console.log ("GET_BY_ID : " + req.body.id);
  b("GET_BY_IDX : " + req.method + ' ' + req.url);
  b("GET_BY_IDX : " + JSON.stringify(req.body));

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

  console.log ("GET_ALL");
  a("GET_ALL : " + req.method + ' ' + req.url);
  a("GET_ALL RCVD: " + JSON.stringify(req.body));
  a("GET_ALL SND: " + JSON.stringify(DATABASE));

  return res.send(JSON.stringify(DATABASE));

});

// DELETE_BY_ID
//
// DELETE http://localhost:3000/api/employees/:id
//
router.delete('/:id', function(req, res) {

  var err = true;
  var employee = null;

  b("DELETE_BY_ID : " + req.method + ' ' + req.url);
  b("DELETE_BY_ID : " + JSON.stringify(req.body));

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
