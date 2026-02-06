# 🚀 Quick Start Guide - Tusa Gato's 24/7 CRM

## ⚡ Start the Frontend (Right Now!)

```bash
cd /Users/johngonzalez/tusagatos-crm/frontend
npm run dev
```

Then open **http://localhost:3000** in your browser.

The dashboard will load with mock data so you can see it in action immediately!

---

## 🤖 Setup RetellAI Agent (One API Call)

Once the backend is running, you can create the AI Receptionist with one API call:

### 1. Start the Backend

```bash
cd /Users/johngonzalez/tusagatos-crm/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Backend will be at **http://localhost:8000**

### 2. Create the AI Receptionist

```bash
# Create the complete Tusa Gato's 24/7 agent
curl -X POST http://localhost:8000/retell/setup-complete
```

This will:
- ✅ Create the agent with the complete Spanish intake prompt
- ✅ Configure voice (Adrian - warm, professional)
- ✅ Set up webhook URL for lead creation
- ✅ Enable call recording and transcription

### 3. Connect Your Phone Number

```bash
# Replace with your actual phone number from RetellAI
curl -X POST http://localhost:8000/retell/connect-number \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1XXXXXXXXXX",
    "agent_id": "agent_xxxxx_from_step_2"
  }'
```

### 4. Test It!

Call your number and talk to the AI Receptionist!

---

## 📊 Dashboard Preview

The dashboard shows:
- **Stats Cards**: Total leads, qualified, converted, response time
- **Case Type Distribution**: Personal injury, workers comp, immigration, etc.
- **Recent Leads Table**: Filterable by status, searchable
- **Quick Actions**: Manage attorneys, view reports, settings

---

## 🧪 Test Without a Phone Call

Send a test webhook to simulate a call:

```bash
curl -X POST http://localhost:8000/retell/test-webhook
```

This creates a sample lead in the system!

---

## 📁 Project Structure

```
tusagatos-crm/
├── frontend/          # Next.js Dashboard (Port 3000)
├── backend/           # FastAPI Server (Port 8000)
├── convex/            # Database Schema
└── .env.local         # Your API keys
```

---

## 🔑 API Keys Setup

| Service | Key |
|---------|-----|
| RetellAI | Set `RETELL_API_KEY` in `.env.local` |
| OpenRouter | Set `OPENROUTER_API_KEY` in `.env.local` |

---

## 🆘 Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Backend won't start
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Convex not connected
Update `CONVEX_URL` in `.env.local` after running:
```bash
npx convex dev
```

---

## 📞 Next Steps

1. ✅ Start frontend: `cd frontend && npm run dev`
2. ✅ Start backend: `cd backend && python main.py`
3. ✅ Create Retell agent: `curl http://localhost:8000/retell/setup-complete`
4. ✅ Connect your phone number
5. ✅ Test a call!

---

## 🌐 Important URLs

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| RetellAI | https://beta.retellai.com/dashboard |

---

*Ready to revolutionize legal referrals for the Hispanic community! 🐱⚖️*
