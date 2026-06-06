// popup.js - Complete with resizable window support (NO DUPLICATES)

let jobData = null;

// Set initial size
document.body.style.width = '450px';
document.body.style.height = 'auto';

async function loadJobDetails() {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = '<div class="loading">🔍 Scanning job page...</div>';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }
    
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot run on Chrome internal pages');
    }
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: "getJobDetails" });
    
    if (response && response.success) {
      jobData = response.data;
      displayResults(response.data);
    } else {
      throw new Error("Could not extract data");
    }
  } catch (error) {
    console.error("Error:", error);
    contentDiv.innerHTML = `
      <div class="error">
        ❌ ${error.message}<br>
        <small>Make sure you're on a job posting page (LinkedIn, Indeed, Glassdoor, etc.)</small>
      </div>
      <button class="retry" onclick="loadJobDetails()">🔄 Retry</button>
    `;
  }
}

function displayResults(data) {
  const hostname = window.location?.hostname || 'unknown';
  const siteName = hostname.replace('www.', '').split('.')[0];
  const siteDisplay = siteName.charAt(0).toUpperCase() + siteName.slice(1);
  
  const hasData = data.company || data.team || data.experience || data.location || 
                  data.mode || data.salary || data.recruiter;
  
  const html = `
    <div class="card">
      <div class="badge-container">
        <span class="site-badge">🔍 Detected: ${siteDisplay}</span>
      </div>
      
      <div class="field">
        <div class="label">🏢 COMPANY NAME</div>
        <div class="value">${escapeHtml(data.company) || '—'}</div>
      </div>
      
      <div class="field">
        <div class="label">👥 TEAM / DEPARTMENT</div>
        <div class="value">${escapeHtml(data.team) || '—'}</div>
      </div>
      
      <div class="field">
        <div class="label">📅 YEARS OF EXPERIENCE</div>
        <div class="value">${escapeHtml(data.experience) || '—'}</div>
      </div>
      
      <div class="field">
        <div class="label">📍 JOB LOCATION</div>
        <div class="value">${escapeHtml(data.location) || '—'}</div>
      </div>
      
      <div class="field">
        <div class="label">💼 WORK MODE</div>
        <div class="value">${escapeHtml(data.mode) || '—'}</div>
      </div>
      
      <div class="field">
        <div class="label">💰 SALARY RANGE</div>
        <div class="value">${escapeHtml(data.salary) || '—'}</div>
      </div>
      
      <div class="field">
        <div class="label">📞 RECRUITER CONTACT</div>
        <div class="value" style="font-size: 11px;">${escapeHtml(data.recruiter) || '—'}</div>
      </div>
    </div>
    
    ${hasData ? '<div class="success">✅ Auto-detected successfully</div>' : 
                '<div class="warning">⚠️ No details found. Try scrolling the page and click Retry.</div>'}
    
    <button id="copyBtn">📋 Copy Summary</button>
    <button id="retryBtn" class="retry">🔄 Retry Extraction</button>
  `;
  
  document.getElementById('content').innerHTML = html;
  
  document.getElementById('copyBtn')?.addEventListener('click', () => copyToClipboard(data));
  document.getElementById('retryBtn')?.addEventListener('click', () => loadJobDetails());
}

function copyToClipboard(data) {
  const text = `
═══════════════════════════════════
📋 JOB SUMMARY
═══════════════════════════════════
🏢 Company: ${data.company || 'Not specified'}
👥 Team: ${data.team || 'Not specified'}
📅 Experience: ${data.experience || 'Not specified'}
📍 Location: ${data.location || 'Not specified'}
💼 Mode: ${data.mode || 'Not specified'}
💰 Salary: ${data.salary || 'Not mentioned'}
📞 Recruiter: ${data.recruiter || 'Not mentioned'}
═══════════════════════════════════
  `;
  
  navigator.clipboard.writeText(text);
  
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    const originalText = copyBtn.innerText;
    copyBtn.innerText = '✅ Copied!';
    copyBtn.style.background = '#28a745';
    setTimeout(() => {
      copyBtn.innerText = originalText;
      copyBtn.style.background = '#4361ee';
    }, 1500);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Auto-resize observer
let resizeTimeout;
function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const width = document.body.offsetWidth;
    const height = document.body.offsetHeight;
    if (width > 300 && height > 300) {
      console.log(`Resized to: ${width}x${height}`);
    }
  }, 200);
}

window.addEventListener('resize', handleResize);

// Start loading
loadJobDetails();