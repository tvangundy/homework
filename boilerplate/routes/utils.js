const errors = require('./errors.js');

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: clearAndRefillArray
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.clearAndRefillArray = function (const_array, newArray, callback) {

    // Clear the const array
    while (const_array.length) {
      const_array.pop();
    }
  
    // Refill it
    for (var i = 0; i < newArray.length; i++) {
      const_array.push (newArray[i]);
    }
  
    callback(null);
}
  
//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: removeItemFromArray
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.removeItemFromArray = function (const_array, id, db_print_method, callback) {

    var found_item = false;
    var newArray = [];
  
    var employee = null;
  
    // Copy the original const array, skipping the item to remove
    for (var i = 0; i < const_array.length; i++) {

      if (const_array[i].id == id) 
      {
        db_print_method ("Found item with ID:" + id);

        found_item = true;
        employee = const_array[i];
      } else {
        newArray.push (const_array[i]);
      }
    }
  
    db_print_method ("newArray.length:" + newArray.length);

    if (found_item) {
        exports.clearAndRefillArray (const_array, newArray, function (err) {
            callback(err, employee);
        });
    } else {
      db_print_method ("Did not find item with ID", id);
      callback(null, null);
    }
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: replaceItemInArray
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.replaceItemInArray = function (const_array, item, callback) {

  var found_item = false;
  var newArray = [];

  // Copy the original const array, replacing the item with the approriate id
  for (var i = 0; i < const_array.length; i++) {

    if (const_array[i].id == item.id) 
    {
        newArray.push (item);
        found_item = true;
    } else {
      newArray.push (const_array[i]);
    }
  }

  if (found_item) {
    exports.clearAndRefillArray (const_array, newArray, function (err) {
        callback(err, item);
      });    
  } else {
    console.log ("NOT FOUND");
    callback(null, null);
  }
}


//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: db_print_json
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.db_print_json = function (db_function_name, message, value)
{
  var json_string = JSON.stringify(value);

  db_function_name (message + " : " + json_string);
  return json_string;
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: printEmployee
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.printEmployee = function (db_function_name, employee) {

    db_function_name ("id : " + employee.id);
    db_function_name ("firstName : " + employee.firstName);
    db_function_name ("lastName : " + employee.lastName);
    db_function_name ("hireDate : " + employee.hireDate);
    db_function_name ("role : " + employee.role);
}
    
//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: findRecordByID
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.findRecordByID = function (const_array, id, callback) {

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
    errors.createErr ("EMPLOYEE_NOT_FOUND_USER", id, function (err) {
      callback (err);
    });
  }  
}    
  
//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: generateID
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.generateID = function (const_array, max_id, callback) {

  var guess_failed = false;
  var valid_id = false;
  var guess_count = 0;

  // Generate a random number in range given
  var id = Math.floor((Math.random() * max_id) + 1);

  // Try to guess 10 times
  while (!valid_id && guess_count < 10) {

    // Check to see if the id is already used
    for (var i = 0; i < const_array.length; i++) {
      if (const_array[i].id == id.toString()) {
        guess_failed = true;
      }
    }

    if (!guess_failed) {
      valid_id = true;
    } else {
      guess_failed = false;
      guess_count = guess_count + 1;
      id = Math.floor((Math.random() * max_id) + 1);
    }
  }

  // If the id is still not valid then switch to manual mode
  if (!valid_id) {

    for (id = 1; id < max_id; id++) {

      // Check to see if the id is already used
      for (var i = 0; i < const_array.length; i++) {
        if (const_array[i].id == id.toString()) {
          guess_failed = true;
        }
      }

      if (!guess_failed) {
        valid_id = true;
        break;
      } 
    }
  }

  // If the id is still not valid then give up and report
  if (!valid_id) {
    errors.createErr ("MAX_RECORDS_LIMIT_REACHED", id, function (err) {
      callback (err, max_id);
    });
  } else {
    callback(null, id.toString());
  }  
}


    
    
  