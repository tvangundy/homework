
//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: clear_and_refill_const_array
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.clear_and_refill_const_array = function (const_array, newArray, callback) {

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
// Function: remove_item_from_const_array_by_id
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.remove_item_from_const_array_by_id = function (const_array, id, callback) {

    var err = null;
    var newArray = [];
  
    var employee = null;
  
    // Copy the original const array, skipping the item to remove
    for (var i = 0; i < const_array.length; i++) {
      if (const_array[i].id != id) 
      {
        newArray.push (const_array[i]);
      } else {
        employee = const_array[i];
      }
    }
  
    exports.clear_and_refill_const_array (const_array, newArray, function (err) {
      callback(err, employee);
    });
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: replace_item_in_const_array_by_id
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.replace_item_in_const_array_by_id = function (const_array, item, callback) {

  var err = null;
  var newArray = [];

  // Copy the original const array, skipping the item to remove
  for (var i = 0; i < const_array.length; i++) {

    if (const_array[i].id == item.id) 
    {
      newArray.push (item);
    } else {
      console.log ("PUSHING : " + const_array[i]);
      newArray.push (const_array[i]);
    }
  }

  exports.clear_and_refill_const_array (const_array, newArray, function (err) {
    callback(err, item);
  });
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
// Function: print_employee
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.print_employee = function (db_function_name, employee) {

    db_function_name ("id : " + employee.id);
    db_function_name ("firstName : " + employee.firstName);
    db_function_name ("lastName : " + employee.lastName);
    db_function_name ("hireDate : " + employee.hireDate);
    db_function_name ("role : " + employee.role);
}
    
    
  
    
    
    
  