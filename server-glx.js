const glx = require('greenlock-express');

glx.init({
    packageRoot: __dirname,
    configDir: './greenlock.d',
    maintainerEmail: 'gantamohan.556@gmail.com', // Using email from .env
    cluster: false
}).serve(require('./server.js'));
