'use strict';
const express = require('express');
const employeeRoutes = require('./routes/employee');
const app = express();
const port = parseInt(process.env.PORT || '3000');

var debug = require('debug')('http')
  , http = require('http')
  , name = 'My App';

debug('booting %o', name); 

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/employees', employeeRoutes);

// Fail over route
app.use(function(req, res) {

    debug(`Fail over route`);

    res.sendfile ("./site_hw/index.html")
    // res.status(404).send('Not found');
});

// listen for requests
app.listen(port, function() {
    console.log(`Server is listening on port ${port}`);
    debug('listening');
});

module.exports = app;
