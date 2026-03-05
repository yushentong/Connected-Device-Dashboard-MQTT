let temp = 0;
let humidity = 0;
let glowAlpha = 0;
let startTime = 0;
let isWarning = false;

const thresholdTemp = 40;
const thresholdHumidity = 25;
const alertDelay = 3000;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight * 0.8);
    canvas.parent('pan-container');
    canvas.style('z-index', '1');
}

function draw() {
    clear();
    updateTime();

    if (temp > thresholdTemp && humidity < thresholdHumidity) {
        glowAlpha = lerp(glowAlpha, 255, 0.05);

        if (startTime === 0) {
            startTime = millis();
        }

        if (millis() - startTime > alertDelay) {
            setAlarmState(true);
        }
    } else {
        glowAlpha = lerp(glowAlpha, 0, 0.1);
        startTime = 0;
        setAlarmState(false);
    }

    if (glowAlpha > 0) {
        drawGlow(width * 0.7, height * 0.45, 500);
    }
    drawPan(width * 0.7, height * 0.45);
}

// ---- MQTT settings (browser uses WebSocket) ----
const brokerUrl = 'wss://tigoe.net/mqtt'; 
const mqttOptions = {
  clean: true,
  connectTimeout: 10_000,
  clientId: 'web-' + Math.floor(Math.random() * 1_000_000),
  username: 'conndev',
  password: 'b4s1l!'
};

// IMPORTANT: topic must match Arduino publish topic
const topic = 'shentong/shtc3';

const mqttClient = mqtt.connect(brokerUrl, mqttOptions);

mqttClient.on('connect', () => {
  console.log('MQTT connected');
  mqttClient.subscribe(topic, (err) => {
    if (err) console.error('Subscribe error:', err);
    else console.log('Subscribed:', topic);
  });
});

mqttClient.on('message', (t, payload) => {
  try {
    const data = JSON.parse(payload.toString());

    // update globals used by draw()
    temp = Number(data.temperature);
    humidity = Number(data.humidity);

    // update UI text
    document.getElementById('temp-display').innerText = temp.toFixed(1);
    document.getElementById('hum-display').innerText = humidity.toFixed(0);

    // show last received time
    const now = new Date();
    document.getElementById('last-update').innerText = 'LAST UPDATE: ' + now.toLocaleTimeString('en-GB');
  } catch (e) {
    console.error('Bad MQTT payload:', payload.toString());
  }
});

mqttClient.on('error', (err) => console.error('MQTT error:', err));
mqttClient.on('close', () => console.log('MQTT closed'));

function updateTime() {
    let h = hour();
    let m = minute();
    let timeStr = nf(h, 2) + ":" + nf(m, 2);
    document.getElementById('current-time').innerText = timeStr;
}

function setAlarmState(state) {
    if (state) {
        document.body.classList.add('warning-active');
    } else {
        document.body.classList.remove('warning-active');
    }
}

function drawGlow(x, y, d) {
    push();
    noStroke();
    for (let r = d; r > 0; r -= 10) {
        let inter = map(r, 0, d, 0, 1);
        let c = color(255, 150, 0, glowAlpha * (1 - inter) * 0.6);
        fill(c);
        ellipse(x, y, r, r);
    }
    pop();
}

function drawPan(x, y) {
    push();
    translate(x, y);
    stroke(0, 80);
    fill(180, 140, 100);
    rect(-15, 120, 30, 200, 10);
    fill(50);
    ellipse(0, 0, 320, 320);
    fill(100);
    ellipse(0, 0, 300, 300);
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}