//node.js run inside VM
const mqtt = require("mqtt");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
const PORT = 3000;

const DATA_DIR = "data";
const MAX_LATEST = 50;

let latest = [];

// create data folder if it does not exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
// function to generate today's file name
function getTodayFile() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    return path.join(DATA_DIR, "mqtt-" + date + ".jsonl");
}

// connect to MQTT broker
const client = mqtt.connect("broker_link",{
    username:"",
    password:""
})

// when MQTT connects
client.on("connect", function () {
    console.log("Connected to MQTT broker");
    client.subscribe("shentong/shtc3");
});

// when a message arrives
client.on("message", function (topic, message) {

    const entry = {
        timestamp: new Date().toISOString(),
        topic: topic,
        message: message.toString()
    };

    const file = getTodayFile();

   // write data to today's file
    fs.appendFile(file, JSON.stringify(entry) + "\n", function (err) {
        if (err) {
            console.error(err);
        }
    });

    // store latest 50 messages for API
    latest.push(entry);

    if (latest.length > MAX_LATEST) {
        latest.shift();
    }
});

// API to return latest messages
app.get("/latest", function (req, res) {
    res.json(latest);
});

// start web server
app.listen(PORT, function () {
    console.log("Server running on port " + PORT);
});
