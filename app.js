// Mocking. You can:
// Read and Write. (Save Gnip costs and ArcGIS Online writes).
// Write without Reading. (Save Gnip costs, but still write to ArcGIS Online).
// Read without Writing? <-- Not yet.
var mock = process.env.MOCK === undefined?false:process.env.MOCK,
    mockRead = mock || (process.env.MOCKREAD === undefined?false:process.env.MOCKREAD),
    mockWrite = mock || (process.env.MOCKWRITE === undefined?false:process.env.MOCKWRITE);

if (mockWrite && mockRead && mockWrite !== mockRead) {
  console.error('If you specify a MOCKREAD and MOCKWRITE setting, they must be the same.');
  process.exit(1); 
}

if (mockWrite && !mockRead) {
  console.error('You cannot currently Mock Writing whilst reading real Gnip data');
  process.exit(1);
}

var mocking = mock || mockRead || mockWrite,
    mockString = mocking?('Mock [' + 
                (mockRead===false?'':('Read' + (mockWrite?'/Write ':' ') + mockRead)) + 
                ']'):'';

var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var clientId = process.env.CLIENT_ID = process.env.CLIENT_ID || '';

var express = require('express'),
    session = require('express-session'),
    responseTime = require('response-time'),
    bodyParser = require('body-parser');

var middleware = require('./lib/middleware'),
    handlers = require('./lib/handlers'),
    paths = require('./lib/route-paths');
    
var app = express();

app.disable("x-powered-by");

app.set('view engine', 'ejs');

// Express Middleware
app.use(session({
  secret: 'Gnipping at your heels',
  resave: true,
  saveUninitialized: true
}));
app.use(responseTime());
if (env === 'production') {
  app.use(middleware.forceSsl);
}
app.use(bodyParser.urlencoded({ extended: false }));
app.use(middleware.parseAuthentication);
app.use(express.static(__dirname + '/public')); // Static support content

// serve the index 
app.get('/', function(req, res, next) {
  // clientId can be read from the node enironment (set in Heroku, for example,
  // or when starting with:
  //      NODE_ENV='production' CLIENT_ID='abcdefghjijk' node app
  res.render(__dirname + '/views/index', { 
    clientId: clientId, 
    mock: mockString,
    env: env
  });
});

// handle POST requests
app.post(paths.count, handlers.handleCount);
app.post(paths.pushQuery, handlers.handlePushQuery);
app.post(paths.createFS, handlers.handleCreateFeatureService);
app.all (paths.queryStatus, handlers.handleQueryStatus);

// Start the server
app.listen(process.env.PORT || 1337,  function() {
  console.log('Listening at http://%s:%d/', this.address().address, this.address().port);
  console.log('Env: ' + env);
  console.log(mocking?mockString:'Mock: N/A');
  console.log('Client ID: ' + clientId);
});
