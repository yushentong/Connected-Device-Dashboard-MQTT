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

WiFiClient wifi;
MqttClient mqttClient(wifi);

char broker[] = "tigoe.net";
int port = 1883;
const char topic[] = "shentong/shtc3";

// Device name
String deviceName = "SHTC3";

// Interval between messages (milliseconds)
int interval = 10000;
unsigned long lastSend = 0;


// Wifi Fall back

// Try connecting to a specific WiFi network
bool tryWiFi(const char* ssid, const char* pass, int maxAttempts = 5) {

  Serial.print("Trying WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, pass);

  int attempts = 0;

  // Wait until connected or max attempts reached
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  // Check if connection succeeded
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected to: ");
    Serial.println(ssid);

    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    return true;
  }

  Serial.print("Failed to connect to: ");
  Serial.println(ssid);

  return false;
}


// Attempt to connect to primary WiFi first, then fallback WiFi
bool connectToWiFi() {

  // Disconnect previous connection to avoid state conflicts
  WiFi.end();

  // Try primary WiFi
  if (tryWiFi(SECRET_SSID, SECRET_PASS)) {
    return true;
  }

  delay(1000);

  // Try backup WiFi
  if (tryWiFi(SECRET_SSID_2, SECRET_PASS_2)) {
    return true;
  }

  Serial.println("Failed to connect to any WiFi network.");

  return false;
}


void setup() {

  Serial.begin(115200);

  // Initialize SHTC3 sensor
  if (!shtc3.begin()) {
    Serial.println("Couldn't find SHTC3");
    while (1);
  }

  Serial.println("Found SHTC3 sensor");


  // Connect to WiFi with fallback support
  while (!connectToWiFi()) {
    Serial.println("Retrying both WiFi networks in 5 seconds...");
    delay(5000);
  }


  // Generate a unique MQTT client ID using MAC address
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

  // Reconnect WiFi if connection drops
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi disconnected. Reconnecting...");

    while (!connectToWiFi()) {
      Serial.println("Retrying WiFi in 5 seconds...");
      delay(5000);
    }
  }


  // If MQTT is not connected, attempt reconnection
  if (!mqttClient.connected()) {

    Serial.println("Connecting to MQTT broker...");

    if (!connectToBroker()) {
      delay(2000);
      return;
    }
  }


  // Send sensor data at specified interval
  if (millis() - lastSend > interval) {

    sensors_event_t humidity, temp;

    shtc3.getEvent(&humidity, &temp);

    float t = temp.temperature;
    float h = humidity.relative_humidity;


    // LED threshold condition
    if (t >= 40.0 && h <= 25.0) {
      digitalWrite(2, HIGH);
    } else {
      digitalWrite(2, LOW);
    }


    // Construct JSON payload
    String message = "{\"device\":\"DEVICE\",\"temperature\":TEMP,\"humidity\":HUMID}";

    message.replace("DEVICE", deviceName);
    message.replace("TEMP", String(t));
    message.replace("HUMID", String(h));


    // Publish MQTT message
    mqttClient.beginMessage(topic);
    mqttClient.print(message);
    mqttClient.endMessage();

    Serial.print("Published: ");
    Serial.println(message);

    lastSend = millis();
  }
}


boolean connectToBroker() {

  // Attempt MQTT connection
  if (!mqttClient.connect(broker, port)) {

    Serial.print("MQTT connection failed. Error no: ");
    Serial.println(mqttClient.connectError());

    return false;
  }

  Serial.println("Connected to MQTT broker.");

  return true;
}