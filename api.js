/**
 * Tusa Gato's 24/7 - Frontend API Integration
 * Connects the existing UI to the FastAPI backend
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

// API Client
const api = {
    // Health check
    async health() {
        try {
            const res = await fetch(`${API_BASE_URL}/health`);
            return await res.json();
        } catch (e) {
            return { status: 'disconnected' };
        }
    },

    // Get all leads
    async getLeads(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.case_type) params.append('case_type', filters.case_type);
        if (filters.county) params.append('county', filters.county);
        
        const res = await fetch(`${API_BASE_URL}/leads?${params}`);
        return await res.json();
    },

    // Get single lead
    async getLead(id) {
        const res = await fetch(`${API_BASE_URL}/leads/${id}`);
        return await res.json();
    },

    // Get dashboard stats
    async getStats() {
        const res = await fetch(`${API_BASE_URL}/analytics/dashboard`);
        return await res.json();
    },

    // Get attorneys
    async getAttorneys() {
        const res = await fetch(`${API_BASE_URL}/attorneys`);
        return await res.json();
    },

    // Create test lead (for demo)
    async testWebhook() {
        const res = await fetch(`${API_BASE_URL}/retell/test-webhook`, {
            method: 'POST'
        });
        return await res.json();
    },

    // Setup RetellAI agent
    async setupAgent(webhookUrl) {
        const res = await fetch(`${API_BASE_URL}/retell/setup-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhook_url: webhookUrl })
        });
        return await res.json();
    },

    // List RetellAI agents
    async listRetellAgents() {
        const res = await fetch(`${API_BASE_URL}/retell/agents`);
        return await res.json();
    },

    // List RetellAI phone numbers
    async listRetellPhoneNumbers() {
        const res = await fetch(`${API_BASE_URL}/retell/phone-numbers`);
        return await res.json();
    },

    // Connect phone number
    async connectNumber(phoneNumber, agentId) {
        const res = await fetch(`${API_BASE_URL}/retell/connect-number`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: phoneNumber, agent_id: agentId })
        });
        return await res.json();
    }
};

// Status mapping for UI
const statusLabels = {
    'new': 'New Lead',
    'qualified': 'Qualified',
    'pending_match': 'Matching...',
    'matched': 'Matched',
    'accepted': 'Accepted',
    'declined': 'Declined',
    'contacted': 'Contacted',
    'converted': 'Converted',
    'closed': 'Closed',
    'spam': 'Spam'
};

const caseTypeLabels = {
    'personal_injury': 'Personal Injury',
    'workers_comp': 'Workers Compensation',
    'construction_accident': 'Construction Accident',
    'criminal': 'Criminal Law',
    'family': 'Family Law',
    'divorce': 'Divorce',
    'immigration': 'Immigration',
    'dui': 'DUI/DWI',
    'traffic': 'Traffic',
    'real_estate': 'Real Estate',
    'other': 'Other'
};

// Load dashboard data
async function loadDashboard() {
    try {
        // Get stats
        const statsRes = await api.getStats();
        if (statsRes.success) {
            updateStats(statsRes.data.leads);
        }

        // Get leads
        const leadsRes = await api.getLeads();
        if (leadsRes.success) {
            updateLeadsTable(leadsRes.data);
        }
    } catch (e) {
        console.error('Failed to load dashboard:', e);
        showNotification('Using demo data - backend not connected');
    }
}

function updateStats(stats) {
    // Update stat cards if they exist
    const statCards = document.querySelectorAll('.stat-value');
    if (statCards.length >= 4 && stats) {
        statCards[0].textContent = stats.total || 156;
        statCards[1].textContent = stats.qualified || 128;
        statCards[2].textContent = stats.converted || 42;
        statCards[3].textContent = '18m';
    }
}

function updateLeadsTable(leads) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody || !leads || leads.length === 0) return;

    tbody.innerHTML = leads.map(lead => `
        <tr onclick="showLeadDetail('${lead._id}')">
            <td>
                <div class="lead-name">
                    <div class="lead-avatar">
                        ${(lead.firstName || 'U')[0]}${(lead.lastName || '')[0]}
                    </div>
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">
                            ${lead.firstName || 'Unknown'} ${lead.lastName || ''}
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted);">
                            ${lead.phone}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span class="case-badge ${lead.caseType}"></span>
                ${caseTypeLabels[lead.caseType] || lead.caseType}
            </td>
            <td>${lead.county}, ${lead.state}</td>
            <td>
                <span class="urgency-badge urgency-${lead.urgency}">
                    ${lead.urgency === 'emergency' ? 'EMERGENCY' : 
                      lead.urgency === 'high' ? 'High' : 
                      lead.urgency === 'medium' ? 'Medium' : 'Low'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${lead.status}">
                    <i class="fas fa-circle" style="font-size: 6px;"></i>
                    ${statusLabels[lead.status] || lead.status}
                </span>
            </td>
            <td>
                <span class="score-badge ${lead.qualificationScore >= 80 ? 'score-high' : lead.qualificationScore >= 60 ? 'score-medium' : 'score-low'}">
                    <i class="fas fa-star" style="font-size: 10px;"></i>
                    ${lead.qualificationScore || '--'}/100
                </span>
            </td>
            <td>${timeAgo(lead.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); showLeadDetail('${lead._id}')">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

async function showLeadDetail(leadId) {
    try {
        const res = await api.getLead(leadId);
        if (res.success) {
            populateLeadDetail(res.data);
            showPage('detail');
        }
    } catch (e) {
        console.error('Failed to load lead:', e);
        showNotification('Could not load lead details');
    }
}

function populateLeadDetail(lead) {
    // Update lead detail page with real data
    document.querySelector('.lead-title-info h1').textContent = `Lead #${lead._id.slice(-8)}`;
    document.querySelector('.lead-title-info p').textContent = `Received ${timeAgo(lead.createdAt)} via ${lead.source}`;
    
    // Update contact info
    const infoValues = document.querySelectorAll('.info-grid .info-value');
    if (infoValues.length >= 6) {
        infoValues[0].innerHTML = `<i class="fas fa-phone"></i> ${lead.phone}`;
        infoValues[1].innerHTML = `<i class="fas fa-globe"></i> ${lead.languagePref === 'spanish' ? 'Spanish' : 'English'}`;
        infoValues[2].innerHTML = `<span class="case-badge ${lead.caseType}"></span> ${caseTypeLabels[lead.caseType] || lead.caseType}`;
        infoValues[3].innerHTML = `<i class="fas fa-map-marker-alt"></i> ${lead.county}, ${lead.state}`;
        infoValues[4].innerHTML = `<span class="score-badge score-high"><i class="fas fa-star"></i> ${lead.qualificationScore || '--'}/100</span>`;
        infoValues[5].innerHTML = `<i class="fas fa-exclamation-circle"></i> ${lead.urgency} Priority`;
    }

    // Update AI summary
    const aiContent = document.querySelector('.ai-summary-content');
    if (aiContent && lead.aiSummary) {
        aiContent.innerHTML = `<p>${lead.aiSummary}</p>`;
    }

    // Update transcript
    const notesArea = document.querySelector('.notes-area');
    if (notesArea && lead.aiTranscript) {
        notesArea.value = lead.aiTranscript;
    }

    // Update call recording link
    const recordingLink = document.getElementById('call-recording-link');
    if (recordingLink) {
        if (lead.recordingUrl) {
            recordingLink.href = lead.recordingUrl;
            recordingLink.textContent = 'Play recording';
        } else {
            recordingLink.removeAttribute('href');
            recordingLink.textContent = 'Not available';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    // Refresh every 30 seconds
    setInterval(loadDashboard, 30000);
});
