const ctx = document.getElementById('iotChart').getContext('2d');

const MAX_POINTS = 50;

// ---- MQTT settings (Browser uses WebSocket / WSS) ----
const MQTT_BROKER_URL = 'wss://tigoe.net/mqtt';
const MQTT_OPTIONS = {
  clean: true,
  connectTimeout: 10_000,
  clientId: 'chart-' + Math.floor(Math.random() * 1_000_000),
  username: 'conndev',
  password: 'b4s1l!'
};

// MUST match your Arduino publish topic:
const MQTT_TOPIC = 'shentong/shtc3';

// ---- Chart state ----
let labels = [];
let tempData = [];
let humData = [];

let chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      label: 'Temperature (°C)',
      borderColor: '#ff3b3b',
      backgroundColor: 'rgba(255, 59, 59, 0.1)',
      data: tempData,
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }, {
      label: 'Humidity (% rH)',
      borderColor: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.1)',
      data: humData,
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    animation: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }
});

function pushPoint(temp, hum) {
  // label as a simple counter
  const nextIndex = labels.length ? (parseInt(labels[labels.length - 1].slice(1)) + 1) : 1;
  labels.push(`#${nextIndex}`);
  tempData.push(temp);
  humData.push(hum);

  // keep only last MAX_POINTS
  while (labels.length > MAX_POINTS) {
    labels.shift();
    tempData.shift();
    humData.shift();
  }

  chart.update('none');
}

function safeParseJsonLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

// Load last 50 from log.json (history)
async function loadHistory() {
  try {
    const response = await fetch('log.json', { cache: 'no-store' });
    const text = await response.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // clear arrays
    labels.length = 0;
    tempData.length = 0;
    humData.length = 0;

    const lastLines = lines.slice(-MAX_POINTS);
    let counter = 1;

    for (const line of lastLines) {
      const data = safeParseJsonLine(line);
      if (!data) continue;

      labels.push(`#${counter++}`);
      tempData.push(Number(data.temperature));
      humData.push(Number(data.humidity));
    }

    chart.update('none');
    console.log('History loaded:', labels.length, 'points');
  } catch (err) {
    console.error('Error loading log.json:', err);
  }
}

// Subscribe to MQTT for realtime updates
function startMqtt() {
  const client = mqtt.connect(MQTT_BROKER_URL, MQTT_OPTIONS);

  client.on('connect', () => {
    console.log('MQTT connected (chart)');
    client.subscribe(MQTT_TOPIC, (err) => {
      if (err) console.error('Subscribe error:', err);
      else console.log('Subscribed:', MQTT_TOPIC);
    });
  });

  client.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());
      const t = Number(data.temperature);
      const h = Number(data.humidity);

      if (Number.isFinite(t) && Number.isFinite(h)) {
        pushPoint(t, h);
      }
    } catch (e) {
      console.error('Bad MQTT payload:', payload.toString());
    }
  });

  client.on('error', (err) => console.error('MQTT error:', err));
  client.on('close', () => console.log('MQTT closed (chart)'));
}

// Run
loadHistory().then(startMqtt);