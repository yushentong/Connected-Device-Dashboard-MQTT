let temp = 0;
let humidity = 0;
let glowAlpha = 0;
let startTime = 0;
let isWarning = false;

const thresholdTemp = 40;
const thresholdHumidity = 25;
const alertDelay = 3000;

const API_URL = "https://api.shentongcreates.com/latest";

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight * 0.8);
    canvas.parent('pan-container');
    canvas.style('z-index', '1');

    fetchLatestMessage();
    setInterval(fetchLatestMessage, 3000);
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

async function fetchLatestMessage() {
    try {
        const response = await fetch(API_URL, { cache: 'no-store' });
        const items = await response.json();

        if (!Array.isArray(items) || items.length === 0) {
            console.log('No data returned from API');
            return;
        }

        const lastItem = items[items.length - 1];

        if (!lastItem || !lastItem.message) {
            console.log('Last item has no message');
            return;
        }

        const data = JSON.parse(lastItem.message);

        const newTemp = Number(data.temperature);
        const newHumidity = Number(data.humidity);

        if (!Number.isFinite(newTemp) || !Number.isFinite(newHumidity)) {
            console.log('Invalid temperature/humidity in latest message');
            return;
        }

        temp = newTemp;
        humidity = newHumidity;

        document.getElementById('temp-display').innerText = temp.toFixed(1);
        document.getElementById('hum-display').innerText = humidity.toFixed(0);

        if (lastItem.timestamp) {
            const ts = new Date(lastItem.timestamp);
            document.getElementById('last-update').innerText =
                'LAST UPDATE: ' + ts.toLocaleTimeString('en-GB');
        } else {
            document.getElementById('last-update').innerText =
                'LAST UPDATE: No timestamp found';
        }

        console.log('Latest API message:', lastItem);
    } catch (err) {
        console.error('Error fetching latest message:', err);
    }
}

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
    resizeCanvas(windowWidth, windowHeight * 0.8);
}