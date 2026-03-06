const ctx = document.getElementById('iotChart').getContext('2d');

const MAX_POINTS = 50;
const API_URL = 'http://34.9.117.62:3000/latest';

let labels = [];
let tempData = [];
let humData = [];

let chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
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

async function loadHistoryFromVM() {
  try {
    const response = await fetch(API_URL, { cache: 'no-store' });
    const items = await response.json();

    labels.length = 0;
    tempData.length = 0;
    humData.length = 0;

    let counter = 1;

    for (const item of items) {
      let payload;

      try {
        payload = JSON.parse(item.message);
      } catch (e) {
        continue;
      }

      const t = Number(payload.temperature);
      const h = Number(payload.humidity);

      if (!Number.isFinite(t) || !Number.isFinite(h)) {
        continue;
      }

      labels.push('#' + counter++);
      tempData.push(t);
      humData.push(h);
    }

    chart.update('none');

    const now = new Date();
    document.getElementById('last-update').innerText =
      'LAST UPDATE: ' + now.toLocaleTimeString('en-GB');

    console.log('Loaded from VM:', labels.length, 'points');
  } catch (err) {
    console.error('Error loading VM data:', err);
  }
}

loadHistoryFromVM();
setInterval(loadHistoryFromVM, 3000);