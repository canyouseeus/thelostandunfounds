# PRD: NOIR AI-Powered CRM
**Project Status:** Initial Discovery & Definition  
**Target Atmosphere:** Minimalist Noir / Ultra-Premium  
**Code Name:** Project Shadow  

---

## 1. Executive Summary
The **NOIR AI-Powered CRM** is a minimalist, high-performance customer relationship management tool designed for users who value speed, privacy, and automated intelligence. Unlike bloated traditional CRMs, NOIR focusing on a "less is more" philosophy, matching the aesthetic of *THE LOST+UNFOUNDS*. It leverages **Firecrawl** for intelligence gathering and **Supabase** for a robust, scalable backend.

---

## 2. Product Vision & UX Philosophy
### 2.1 The "Noir" Aesthetic
The UI must feel like a high-end physical portfolio—stark, decisive, and devoid of noise.
- **Color Palette:** Pure Black (`#000000`), Pure White (`#ffffff`), and Void Grey (`rgba(255, 255, 255, 0.1)`).
- **Typography:** Inter for body text, uppercase sans-serif for headings.
- **Motion:** Subtle fade-ins and high-speed transitions. No "bouncing" or playful animations.
- **Structure:** Branded headers, sharp borders (no border-radius), and a focus on verticality.

### 2.2 User Experience (UX)
The UX is built around **Direct Action**. 
- **Command-first:** Quick entry and search.
- **Intelligence-first:** Leads don't just appear; they come enriched with data from Firecrawl.
- **Zero Friction:** One-click transitions between pipeline stages.

---

## 3. Core Feature Specifications

### 3.1 Contact & Lead Management (CRUD)
- **Manual Input:** A stark, white-on-black form for creating contacts with fields for Name, Company, Email, Role, and Value.
- **Contact Store:** A high-contrast table view with sorting and filtering.
- **Detail View:** A side-panel (drawer) that opens when clicking a lead, showing history and AI-enriched notes.

### 3.2 Pipeline Management (The Shadow Board)
- **Kanban-like Columns:** Clear, vertical columns representing stages: `DISCOVERY`, `NEGOTIATION`, `WON`, `LOST`.
- **Lead Movement:** Drag-and-drop or simple dropdown rank updates to move leads through the pipeline.
- **Ranking System:** A 1-5 "Priority Score" visualized as small white dashes or dots.

### 3.3 AI Data Enrichment with Firecrawl
- **Web Scraping:** Input a URL (e.g., a company's LinkedIn or website), and NOIR uses Firecrawl to extract key contact data, recent news, and description.
- **Automated Inputs:** AI suggests new leads based on a target URL or keyword, feeding them directly into the `DISCOVERY` stage.

### 3.4 Backend & Security (Supabase)
- **Database:** Supabase Postgres for relational data.
- **Authentication:** Supabase Auth with custom styling matching the noir theme.
- **Real-time:** Updates across columns reflect instantly for all team members.

---

## 4. UI/UX Analysis & Visual Design

### 4.1 Header & Navigation
- **Header:** Sticky top bar with the `THE LOST+UNFOUNDS` logo (left) and a "CAN YOU SEE US?" status indicator.
- **Navigation:** A minimalist sidebar or hidden menu (hamburger) that reveals direct links: `BOARD`, `CONTACTS`, `ENRICH`, `SETTINGS`.

### 4.2 The "Shadow Board" View
Each "Lead Card" is a simple white outline box. 
- **States:**
  - **Inactive:** Content is slightly dimmed (`opacity: 0.6`).
  - **Hover:** Border glows pure white, text highlights to 100% opacity.
  - **Dragging:** Semi-transparent ghosting with no drop shadow.

### 4.3 Forms & Inputs
- **Inputs:** Simple white bottom-border only. Labels are small, uppercase, and positioned above the input.
- **Buttons:** Sharp 90-degree corners. 
  - **Primary:** Solid White with Black text.
  - **Secondary:** Transparent with White border.

---

## 5. Technical Requirements

| Module | technology | Implementation Detail |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Fast, modern, type-safe development. |
| **Styling** | Vanilla CSS / Tailwind | Minimalist utility classes with rigid spacing. |
| **Database** | Supabase Postgres | Tables: `contacts`, `leads`, `pipelines`, `enrichment_runs`. |
| **AI Scraping**| Firecrawl API | Used to fetch metadata from any URL provided in the "Enrich" panel. |
| **Deployment** | Vercel | Seamless integration with the existing ecosystem. |

---

## 6. Functional Scenarios (User Flows)

### Scenario A: Creating a Lead Manually
1. User clicks `+ NEW LEAD`.
2. A stark black drawer slides from the right.
3. User types Name and Company.
4. User clicks `SAVE`. The card appears in the `DISCOVERY` column with a fade-in animation.

### Scenario B: AI Enrichment
1. User enters a URL: `linkedin.com/company/example`.
2. Firecrawl scrapes the site.
3. AI parses the result into: `Company Name`, `Primary Industry`, `Suggested Contact`.
4. User reviews and "Accepts" the lead into the CRM.

---

## 7. Future AI Roadmap
- **Predictive Ranking:** AI suggests priority scores based on previous "WON" leads.
- **Tone-Matched Email:** Generate outbound emails that match the "Noir" branding style.
- **Automated Cleanup:** AI merges duplicate contacts found via web scraping.

---

## 8. Compliance & Standards
- **No Emojis:** Strict adherence to the brand guide.
- **Accessibility:** High contrast ensures readable content for all users.
- **Privacy:** Supabase RLS (Row Level Security) ensures user data is isolated.

---
**Prepared by:** Antigravity  
**Date:** December 22, 2025
