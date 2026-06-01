const configRules = [
    { id: 'removeDuplicates', label: 'Remove Duplicates', default: true },
    { id: 'removeEmptyRows', label: 'Remove Empty Rows', default: true },
    { id: 'trimWhitespace', label: 'Trim Whitespace', default: true },
    { id: 'standardizeText', label: 'Standardize Text', default: true },
    { id: 'roundNumbers', label: 'Round Numbers', default: true },
    { id: 'fillMissingValues', label: 'Fill Missing Values', default: true },
    { id: 'calculateTotal', label: 'Calculate Total', default: true },
    { id: 'validateAge', label: 'Validate Age', default: true },
    { id: 'validateSalary', label: 'Validate Salary', default: true },
    { id: 'validateEmails', label: 'Validate Emails', default: true }
];

let globalFile = null;
let globalCsvContent = null;
let chartInstance = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadText = document.getElementById('uploadText');
const uploadSize = document.getElementById('uploadSize');
const uploadIcon = document.getElementById('uploadIcon');
const rulesList = document.getElementById('rulesList');
const runBtn = document.getElementById('runBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

const emptyState = document.getElementById('emptyState');
const resultsView = document.getElementById('resultsView');

const valTotalRows = document.getElementById('valTotalRows');
const valTotalMissing = document.getElementById('valTotalMissing');
const valColumns = document.getElementById('valColumns');
const statsList = document.getElementById('statsList');
const logContainer = document.getElementById('logContainer');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');

// Initialize Rules UI
configRules.forEach(rule => {
    const div = document.createElement('div');
    div.className = 'rule-item';
    div.innerHTML = `
        <span>${rule.label}</span>
        <label>
            <input type="checkbox" id="${rule.id}" ${rule.default ? 'checked' : ''} style="display:none">
            <div class="toggle"></div>
        </label>
    `;
    rulesList.appendChild(div);
});

// Upload Logic
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('active'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('active'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('active');
    handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
        alert("Please upload a CSV file");
        return;
    }
    globalFile = file;
    uploadArea.classList.add('has-file');
    uploadText.textContent = file.name;
    uploadSize.textContent = (file.size / 1024).toFixed(2) + ' KB';
    uploadIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
    runBtn.disabled = false;
}

// Reset Logic
resetBtn.addEventListener('click', () => {
    globalFile = null;
    globalCsvContent = null;
    fileInput.value = '';
    uploadArea.classList.remove('has-file');
    uploadText.textContent = 'Click to upload CSV or drag and drop';
    uploadSize.textContent = '';
    uploadIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
    runBtn.disabled = true;
    downloadBtn.disabled = true;
    emptyState.classList.remove('hidden');
    resultsView.classList.add('hidden');
    logContainer.innerHTML = '<div class="log-line empty">Waiting for process...</div>';
});

// Run Pipeline
runBtn.addEventListener('click', async () => {
    if (!globalFile) return;

    // Build config
    const config = {};
    configRules.forEach(r => {
        config[r.id] = document.getElementById(r.id).checked;
    });

    const formData = new FormData();
    formData.append('file', globalFile);
    formData.append('config', JSON.stringify(config));

    // UI State
    runBtn.disabled = true;
    runBtn.querySelector('.spinner').classList.remove('hidden');
    runBtn.querySelector('span').textContent = 'Processing...';
    
    emptyState.classList.add('hidden');
    resultsView.classList.remove('hidden');
    logContainer.innerHTML = '<div class="log-line empty">Processing started...</div>';

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            globalCsvContent = data.csv_content;
            downloadBtn.disabled = false;
            updateDashboard(data);
        } else {
            console.error(data.error);
            logContainer.innerHTML += `<div class="log-line"><span class="log-time">Now</span> <span class="log-level error">ERROR:</span> <span class="log-msg">${data.error}</span></div>`;
        }
    } catch (err) {
        console.error(err);
        alert('Failed to connect to the backend API.');
    } finally {
        runBtn.disabled = false;
        runBtn.querySelector('.spinner').classList.add('hidden');
        runBtn.querySelector('span').textContent = 'Run Pipeline';
    }
});

function updateDashboard(data) {
    const report = data.report;
    
    // Update Metrics
    valTotalRows.textContent = report.totalRows;
    const totalMiss = Object.values(report.missingValues).reduce((a,b)=>a+b, 0);
    valTotalMissing.textContent = totalMiss;
    valColumns.textContent = Object.keys(report.missingValues).length;

    // Render Chart
    renderChart(report.missingValues);

    // Render Stats
    statsList.innerHTML = '';
    const statsKeys = Object.keys(report.summaryStats);
    if (statsKeys.length === 0) {
        statsList.innerHTML = '<div class="stat-item">No numeric columns found.</div>';
    } else {
        statsKeys.forEach(col => {
            const stat = report.summaryStats[col];
            statsList.innerHTML += `
                <div class="stat-item">
                    <h4>${col}</h4>
                    <div class="stat-grid">
                        <span>Mean:</span> <span>${stat.mean.toFixed(2)}</span>
                        <span>Median:</span> <span>${stat.median.toFixed(2)}</span>
                        <span>Min:</span> <span>${stat.min}</span>
                        <span>Max:</span> <span>${stat.max}</span>
                    </div>
                </div>
            `;
        });
    }

    // Render Logs
    logContainer.innerHTML = '';
    data.logs.forEach((log, i) => {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.style.animationDelay = `${i * 0.05}s`;
        line.innerHTML = `
            <span class="log-time">[${log.timestamp}]</span>
            <span class="log-level ${log.level}">${log.level.toUpperCase()}:</span>
            <span class="log-msg">${log.message}</span>
        `;
        logContainer.appendChild(line);
    });
    // Auto scroll bottom
    logContainer.scrollTop = logContainer.scrollHeight;

    // Render Table Preview
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    if (data.preview && data.preview.length > 0) {
        const trH = document.createElement('tr');
        Object.keys(data.preview[0]).forEach(k => {
            trH.innerHTML += `<th>${k}</th>`;
        });
        tableHead.appendChild(trH);

        data.preview.forEach(row => {
            const trB = document.createElement('tr');
            Object.values(row).forEach(v => {
                trB.innerHTML += `<td>${v !== null ? v : 'NULL'}</td>`;
            });
            tableBody.appendChild(trB);
        });
    }
}

function renderChart(missingVals) {
    const ctx = document.getElementById('missingChart').getContext('2d');
    
    if (chartInstance) chartInstance.destroy();

    const labels = Object.keys(missingVals);
    const data = Object.values(missingVals);
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Missing Values',
                data: data,
                backgroundColor: data.map(v => v > 0 ? '#f59e0b' : '#4f46e5'),
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });
}

// Download logic
downloadBtn.addEventListener('click', () => {
    if (!globalCsvContent) return;
    const blob = new Blob([globalCsvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${globalFile.name}`;
    a.click();
    URL.revokeObjectURL(url);
});
