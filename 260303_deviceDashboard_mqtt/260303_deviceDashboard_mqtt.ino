// Code Reference:
// https://github.com/tigoe/html-for-conndev/tree/main/DeviceDataDashboard
// https://learn.adafruit.com/adafruit-sensirion-shtc3-temperature-humidity-sensor/arduino
// https://github.com/tigoe/mqtt-examples/blob/main/arduino-clients/ArduinoMqttClient-SHTC3Sender/ArduinoMqttClient-SHTC3Sender.ino
// https://github.com/tigoe/mqtt-examples/blob/main/node-clients/MqttNodeClientFileWriter/client.js 
// https://github.com/tigoe/mqtt-examples/blob/main/browser-clients/mqttjs/mqttjs-client-simple/script.js 

#include "Adafruit_SHTC3.h"
#include <WiFiNINA.h>
#include <Wire.h>
#include <ArduinoMqttClient.h>
#include "arduino_secrets.h"

Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();

// Use SSL client for secure MQTT (port 8883)
WiFiClient wifi; 
MqttClient mqttClient(wifi);

char broker[] = "tigoe.net";
int port = 1883;
const char topic[] = "shentong/shtc3";

// Device name
String deviceName = "SHTC3";

// Message sending interval (ms)
int interval = 10000;
unsigned long lastSend = 0;

void setup() {

  Serial.begin(115200);

  if (!shtc3.begin()) {
    Serial.println("Couldn't find SHTC3");
    while (1);
  }
  Serial.println("Found SHTC3 sensor");

  // Connect to WiFi
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print("Connecting to SSID: ");
    Serial.println(SECRET_SSID);
    WiFi.begin(SECRET_SSID, SECRET_PASS);
    delay(2000);
  }

  Serial.println("Connected to WiFi");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Set MQTT client ID (must be unique)
  String clientID = "SHTC3Client-";
  byte mac[6];
  WiFi.macAddress(mac);
  for (int i = 0; i < 3; i++) {
    clientID += String(mac[i], HEX);
  }

  mqttClient.setId(clientID);
  mqttClient.setUsernamePassword(SECRET_MQTT_USER, SECRET_MQTT_PASS);

  pinMode(2, OUTPUT);
}

void loop() {

  // If not connected to broker, try to reconnect
  if (!mqttClient.connected()) {
    Serial.println("Connecting to MQTT broker...");
    if (!connectToBroker()) return;   
  }

  // Send sensor data at interval
  if (millis() - lastSend > interval) {

    sensors_event_t humidity, temp;
    shtc3.getEvent(&humidity, &temp);

    float t = temp.temperature;
    float h = humidity.relative_humidity;

    // LED threshold logic
    if (t >= 40.0 && h <= 25.0) {
      digitalWrite(2, HIGH);
    } else {
      digitalWrite(2, LOW);
    }

    // Build JSON payload
    String message = "{\"device\":\"DEVICE\",\"temperature\":TEMP,\"humidity\":HUMID}";
    message.replace("DEVICE", deviceName);
    message.replace("TEMP", String(t));
    message.replace("HUMID", String(h));

    // Publish message
    mqttClient.beginMessage(topic);
    mqttClient.print(message);
    mqttClient.endMessage();

    Serial.print("Published: ");
    Serial.println(message);

    lastSend = millis();
  }
}

boolean connectToBroker() {
  // if the MQTT client is not connected:
  if (!mqttClient.connect(broker, port)) {
    // print out the error message:
    Serial.print("MOTT connection failed. Error no: ");
    Serial.println(mqttClient.connectError());
    // return that you're not connected:
    return false;
  }
  // once you're connected, you
  // return that you're connected:
  return true;
}