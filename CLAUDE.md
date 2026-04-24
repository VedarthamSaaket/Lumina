## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

---

# Lumina: Master Context & AI Guidelines

Lumina is a "personal sanctuary"—a high-end, clinical-grade psychological architecture disguised as a warm, premium companion. It prioritizes local-first privacy, clinical efficacy, and a "gold-glimmer" aesthetic.

## 1. The Core Duality: Lumina & Orion

The project is split into two distinct yet integrated cognitive-emotional engines:

### **Lumina (The Heart)**
- **Role**: Emotional support, feelings, journaling, CBT, and mental wellbeing checks.
- **Tone**: Warm, caring friend, non-clinical, "sugarcoated" psychological concepts.
- **Visuals**: Gold shimmer, warm chocolate tones, parchment textures.
- **Clinical Roots**: CBT (Cognitive Behavioral Therapy), PHQ-9 (Mood), GAD-7 (Anxiety).

### **Orion (The Mind)**
- **Role**: Cognitive side, memory analysis, brain science, thinking skills, and personal coaching.
- **Tone**: Analytical but encouraging, intellectual companion, focused on "how you think."
- **Visuals**: Blue/Orion tones (#5B9BD5), particle canvases, spatial reasoning puzzles.
- **Clinical Roots**: Fluid intelligence (Cattell Culture Fair), Working Memory models.

---

## 2. Interaction Guidelines (The "Secret Sauce")

- **Invisible Clinical Branding**: Never use technical psychological terms (e.g., "cognitive distortions"). Instead, use layperson terms (e.g., "patterns in how we think").
- **The Reflective Sandwich**: A technique used in `llm.py` where AI responses start with empathy, provide a clinical insight (sugarcoated), and end with a warm redirection.
- **Cognitive Threading**: The ability to track metrics (cognitive load, focus, mood) across sessions to provide specific, data-backed coaching.
- **Short & Sweet**: Casual chat should be 2-4 sentences max. Deeper emotional support can be longer but must remain focused.
- **Boundaries**: Strictly professional/warm friend. No romantic/sexual scenarios. No politics or controversial opinions unless directly tied to the user's mental health.

---

## 3. Technical Architecture

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion for premium animations.
- **Backend**: Python (FastAPI), Groq (Llama 3.3 70B), local-first data principles.
- **Key Files**:
  - `backend/services/llm.py`: The brain of the interaction, containing system prompts and tool redirect logic.
  - `frontend/src/styles/globals.css`: The source of truth for the design system (CSS variables, animations).
  - `frontend/src/app/orion/`: The interactive coaching panel.

---

## 4. Design System (Aesthetic Excellence)

- **Palette**: 
  - Dark: Rich Warm Chocolate (#0f0805)
  - Gold: #d4af37 (Gold Shimmer)
  - Light: Warm Cream Parchment (#fef4e4)
- **Typography**:
  - Headings: `Libre Baskerville` (Italic, Gold Shimmer)
  - Body: `EB Garamond`
  - UI/Chat: `Jost`
- **Animations**: Subtle micro-animations, grain overlays, glassmorphism (`backdrop-filter`), and gold-shimmer text effects.

---

## 5. Tool Redirect System

Lumina uses a `TOOL_REDIRECT` syntax to move users between features. NEVER provide external advice if an in-app tool exists.

**Valid Tool Keys**:
- `/journal`: Mood logging & entries.
- `/screening?test=X`: (MOOD, WORRY, SELFWORTH, BIGFIVE, etc.)
- `/cbt?module=X`: (distortion, reframing, activation, habit, etc.)
- `/cognitive/memory`: Memory & Intelligence games.
- `/crisis`: Immediate support resources.

---

## 6. Safety & Clinical Boundaries

- **Risk Detection**: Levels 1-3 based on keywords. Level 3 (Imminent) triggers emergency resources only.
- **No Diagnosis**: Never say "You have [Condition]." Use "It looks like you're experiencing [Symptom]."
- **Crisis Footer**: Always include iCall (9152987821) or Crisis Text Line (HOME to 741741) in distress responses.

---

## 7. Source File Absolute Paths

```text
C:\Users\Saaket Vedarth\Lumina\CLAUDE.md
C:\Users\Saaket Vedarth\Lumina\claude.md
C:\Users\Saaket Vedarth\Lumina\docker-compose.yml
C:\Users\Saaket Vedarth\Lumina\README.md
C:\Users\Saaket Vedarth\Lumina\backend\config.py
C:\Users\Saaket Vedarth\Lumina\backend\main.py
C:\Users\Saaket Vedarth\Lumina\backend\services\llm.py
C:\Users\Saaket Vedarth\Lumina\backend\models\database.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\auth.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\cbt.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\chat.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\cognitive.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\crisis.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\dashboard.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\journal.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\mood.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\orion.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\screening.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\settings.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\stickers.py
C:\Users\Saaket Vedarth\Lumina\backend\routers\summary.py
C:\Users\Saaket Vedarth\Lumina\frontend\next.config.js
C:\Users\Saaket Vedarth\Lumina\frontend\tailwind.config.ts
C:\Users\Saaket Vedarth\Lumina\frontend\src\middleware.ts
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\layout.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\cbt\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\chat\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\cognitive\memory\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\crisis\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\dashboard\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\journal\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\orion\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\screening\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\app\settings\page.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\journal\BookScene.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\journal\OpenBook.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\layout\Navigation.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\orion\OrionChatPanel.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\orion\OrionCompanion.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\orion\OrionRightPanel.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\ui\GoldHeading.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\components\ui\ParticleCanvas.tsx
C:\Users\Saaket Vedarth\Lumina\frontend\src\lib\api.ts
C:\Users\Saaket Vedarth\Lumina\frontend\src\lib\orionBridge.ts
C:\Users\Saaket Vedarth\Lumina\frontend\src\lib\themeStore.ts
C:\Users\Saaket Vedarth\Lumina\frontend\src\styles\globals.css
```
