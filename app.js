var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const { EventHubConsumerClient } = require("@azure/event-hubs");
const WebSocket = require("ws");


//const connectionString = process.env.CONNECTION_STRING;
const connectionString = "Endpoint=sb://germanywestcentraldedns014.servicebus.windows.net/;SharedAccessKeyName=iothubowner;SharedAccessKey=k0GrmT5kwxIYbUXcSHkYDKz2bb+Z6oDLdAIoTD2cEqk=;EntityPath=iothub-ehub-iot-hub-we-55622020-326b77527c;HostName=iot-hub-web.azure-devices.net;DeviceId=pi-weather"
const consumerGroup = "$Default"; // Default consumer group

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: 80 });

let clients = [];

// Handle new WebSocket connections
wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    clients.push(ws);

    ws.on("close", () => {
        console.log("WebSocket connection closed");
        clients = clients.filter((client) => client !== ws);
    });
});

async function main() {
    console.log("Initializing Event Hub client...");
    console.log(connectionString)
    const client = new EventHubConsumerClient(consumerGroup, connectionString);

    console.log("Listening for messages...");
    client.subscribe({
        processEvents: async (events, context) => {
            for (const event of events) {
                const message = JSON.stringify(event.body);
                console.log(`Message received: ${message}`);

                // Broadcast message to all connected WebSocket clients
                clients.forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(message);
                    }
                });
            }
        },
        processError: async (err, context) => {
            console.error(`Error: ${err}`);
        }
    });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

main().catch((err) => {
    console.error("Error: ", err);
});

module.exports = app;
