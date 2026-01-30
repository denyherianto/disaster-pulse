# Disaster Pulse - Hackathon Feature Implementation Plan

> **Deadline**: Gemini 3 Hackathon Submission
> **Goal**: Maximize Technical Execution (40%) + Innovation (30%) scores

---

## Phase 1: Critical Requirements ⚡ (Day 1)

### 1.1 Upgrade to Gemini 3 API
> **Priority**: 🔴 BLOCKER - Hackathon requirement

- [ ] Update `base.agent.ts` model constant to Gemini 3
- [ ] Update `video-analysis.agent.ts` model to Gemini 3
- [ ] Update all other agents to use Gemini 3
- [ ] Test API connection and verify responses
- [ ] Add "Powered by Gemini 3" badge to UI

**Files:**
- `apps/api/src/reasoning/agents/base.agent.ts`
- `apps/api/src/reasoning/agents/video-analysis.agent.ts`
- `apps/web/src/components/ui/GeminiIcon.tsx`

---

### 1.2 Demo Mode (Seed Data System)
> **Priority**: 🔴 HIGH - Never demo with empty state

- [ ] Create demo seed script `/scripts/demo-seed.ts`
- [ ] Seed data includes:
  - 1 High-severity earthquake (Jakarta, M6.5)
  - 1 Medium flood (Surabaya)
  - 1 Fire (Bandung)
  - 5+ user verification reports per incident
  - Corresponding agent traces for transparency panel
- [ ] Add API endpoint `POST /admin/demo/seed`
- [ ] Add hidden trigger (tap logo 5x) in frontend
- [ ] Add reset endpoint `POST /admin/demo/reset`

**Files:**
- `scripts/demo-seed.ts` [NEW]
- `apps/api/src/admin/admin.controller.ts`
- `apps/web/src/components/dashboard/DashboardHeader.tsx`

---

## Phase 2: AI Transparency (Days 2-3)

### 2.1 AI Reasoning Panel
> **Priority**: 🟡 HIGH - Show the AI magic to judges

**Backend:**
- [ ] Create `GET /incidents/:id/reasoning` endpoint
- [ ] Return agent traces (Observer → Classifier → Skeptic → Synthesizer → Action)
- [ ] Include timestamps and confidence changes

**Frontend:**
- [ ] Add "🤖 Why?" button on incident cards
- [ ] Create `AIReasoningPanel` component
- [ ] Show reasoning steps with expandable details
- [ ] Add visual timeline of agent decisions

**Files:**
- `apps/api/src/incidents/incidents.controller.ts`
- `apps/api/src/incidents/incidents.service.ts`
- `apps/web/src/components/incident/AIReasoningPanel.tsx` [NEW]
- `apps/web/src/app/(mobile)/incidents/[id]/page.tsx`

---

### 2.2 Real-time Streaming AI Responses
> **Priority**: 🟡 MEDIUM - Creates "wow" moment

- [ ] Enable Gemini 3 streaming in agent base class
- [ ] Create SSE endpoint for reasoning stream
- [ ] Update `LiveIntelligenceTicker` to consume real stream
- [ ] Show "Thinking..." animation with actual tokens

**Files:**
- `apps/api/src/reasoning/agents/base.agent.ts`
- `apps/api/src/sse/sse.controller.ts`
- `apps/web/src/components/dashboard/LiveIntelligenceTicker.tsx`

---

## Phase 3: Interactive Features (Days 3-4)

### 3.1 AI-Powered Report Form
> **Priority**: 🟡 MEDIUM - Interactive demo for judges

- [ ] Create `ImageAnalysisAgent` for static images
- [ ] On image upload → AI analyzes → Pre-fill form
- [ ] Show "✨ AI Suggestion" banner with auto-detected:
  - Event type
  - Severity
  - Description draft
- [ ] User can accept/edit suggestions

**Files:**
- `apps/api/src/reasoning/agents/image-analysis.agent.ts` [NEW]
- `apps/api/src/sources/reports/reports.controller.ts`
- `apps/web/src/app/(mobile)/report/page.tsx` [NEW or MODIFY]

---

### 3.2 Impact Metrics Dashboard
> **Priority**: 🟡 MEDIUM - Addresses "Potential Impact" criterion

- [ ] Create `GET /stats/impact` endpoint
- [ ] Metrics to track:
  - Total alerts delivered
  - People reached (based on zone subscribers)
  - Disasters tracked this month
  - Average alert speed vs news
- [ ] Add `ImpactMetrics` component below LiveIntelligenceTicker
- [ ] Animated counter effect on load

**Files:**
- `apps/api/src/admin/stats.controller.ts` [NEW]
- `apps/web/src/components/dashboard/ImpactMetrics.tsx` [NEW]
- `apps/web/src/app/(mobile)/page.tsx`

---

## Phase 4: Gemini 3 Showcase (Day 4-5)

### 4.1 Multimodal Disaster Assistant (Chat)
> **Priority**: 🟢 NICE-TO-HAVE - Ultimate differentiator

- [ ] Create `DisasterAssistantAgent` with context injection
- [ ] Support text + image/video in chat
- [ ] Ground responses in active incidents
- [ ] Create `/chat` endpoint with session management
- [ ] Build chat UI component

**Files:**
- `apps/api/src/reasoning/agents/assistant.agent.ts` [NEW]
- `apps/api/src/chat/chat.controller.ts` [NEW]
- `apps/api/src/chat/chat.service.ts` [NEW]
- `apps/web/src/app/(mobile)/chat/page.tsx` [NEW]
- `apps/web/src/components/chat/ChatInterface.tsx` [NEW]

---

## Phase 5: Polish & Submission (Day 5-6)

### 5.1 Architecture Diagram
- [ ] Create Mermaid diagram for README
- [ ] Export as PNG for Devpost submission
- [ ] Add to project documentation

### 5.2 Demo Video (3 min max)
- [ ] Script the demo flow
- [ ] Record: Dashboard → Incident → AI Reasoning → Report → Chat
- [ ] Highlight Gemini 3 features explicitly
- [ ] Add captions/annotations

### 5.3 Devpost Submission
- [ ] Write 200-word Gemini integration description
- [ ] Public project link (deployed)
- [ ] Public GitHub repo link
- [ ] Upload demo video

---

## Implementation Schedule

| Day | Focus | Deliverables |
|-----|-------|--------------|
| **1** | Critical | Gemini 3 upgrade, Demo seed |
| **2** | Transparency | AI Reasoning endpoint + panel |
| **3** | Streaming | Real-time reasoning display |
| **4** | Interactive | AI report pre-fill, Impact metrics |
| **5** | Showcase | Chat assistant (if time permits) |
| **6** | Polish | Video, diagram, submission |

---

## Success Criteria

- [ ] All agents use Gemini 3 API
- [ ] Demo mode works flawlessly (zero empty states)
- [ ] AI reasoning visible to users
- [ ] At least one interactive AI feature (report pre-fill OR chat)
- [ ] Impact metrics displayed
- [ ] 3-min demo video recorded
- [ ] Architecture diagram included
- [ ] Devpost submission complete

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Gemini 3 API issues | Have fallback to 2.5-flash, document the attempt |
| Demo data looks fake | Use realistic Indonesian locations/events |
| Chat feature too slow | Make it optional, focus on core features |
| Time crunch | Cut Phase 4 (Chat) if needed, it's nice-to-have |
