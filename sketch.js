let temp = 0;
let humidity = 0;
let glowAlpha = 0;
let startTime = 0;

const thresholdTemp = 40;
const thresholdHumidity = 25;
const alertDelay = 3000;

const API_URL = "https://api.shentongcreates.com/latest";
const OFFLINE_THRESHOLD_MS = 90 * 1000; // 1.5 minutes

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
            setDeviceStatus(false);
            return;
        }

        const lastItem = items
            .filter(item => item.timestamp && item.message)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        if (!lastItem) {
            console.log('No valid latest item found');
            setDeviceStatus(false);
            return;
        }

        const data = JSON.parse(lastItem.message);

        const newTemp = Number(data.temperature);
        const newHumidity = Number(data.humidity);

        if (!Number.isFinite(newTemp) || !Number.isFinite(newHumidity)) {
            console.log('Invalid temperature/humidity in latest message');
            setDeviceStatus(false);
            return;
        }

        temp = newTemp;
        humidity = newHumidity;

        document.getElementById('temp-display').innerText = temp.toFixed(1);
        document.getElementById('hum-display').innerText = humidity.toFixed(0);

        if (lastItem.timestamp) {
            const ts = new Date(lastItem.timestamp);
            const now = new Date();
            const ageMs = now - ts;

            document.getElementById('last-update').innerText =
                'LAST UPDATE: ' + ts.toLocaleTimeString('en-GB');

            if (ageMs > OFFLINE_THRESHOLD_MS) {
                setDeviceStatus(false);
            } else {
                setDeviceStatus(true);
            }
        } else {
            document.getElementById('last-update').innerText =
                'LAST UPDATE: No timestamp found';
            setDeviceStatus(false);
        }

        console.log('Latest API message:', lastItem);
    } catch (err) {
        console.error('Error fetching latest message:', err);
        setDeviceStatus(false);
    }
}

function setDeviceStatus(isOnline) {
    const el = document.getElementById('device-status');
    if (!el) return;

    if (isOnline) {
        el.innerText = 'DEVICE STATUS: ON';
        el.style.color = 'limegreen';
    } else {
        el.innerText = 'DEVICE STATUS: OFF';
        el.style.color = 'red';
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