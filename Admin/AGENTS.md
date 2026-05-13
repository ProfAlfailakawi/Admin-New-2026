# SYSTEM & AGENT DIRECTIVES: TURAATH BI ENGINE

## 1. ZERO HALLUCINATION POLICY (CRITICAL)
- **NO FAKE DATA:** Never assume, guess, or make up data to fill gaps. 
- **NO GENERIC ADVICE:** Do not output internet-style generic business logic. Every analysis, AI recommendation, and percentage MUST mathematically originate from real system state (e.g. `invoices`, `products`, `customers`, `reviews`).
- **NO PLACEHOLDER METRICS:** Do not use assumed conversion rates, LTV elasticity estimates, or baseline arbitrary growth metrics.
- **OMISSION OVER FICTION:** If there isn't enough data to generate an insight, the system MUST gracefully default to: `لا توجد بيانات كافية للتحليل` (Insufficient data for analysis).

## 2. REAL-TIME SYNCHRONOUS LOGIC
- **NO FAKE AI DELAYS:** Do not use `setTimeout` or synthetic loaders to mimic "AI thinking" for synchronous business rule engine functions. Analysis should be instantly returned unless making actual external API calls.

## 3. ABSOLUTE UI INTERACTION RULES
- **NO DEAD ICONS:** Every single icon, button, or visual trigger MUST have an `onClick` or interaction handler.
- **IMMEDIATE VISUAL FEEDBACK:** Clickable items must trigger either a Modal, Navigation, or a `toast` message, accompanied by active press animations (e.g., `active:scale-95`).

## 4. KUWAITI DIALECT & CONTEXTUAL SENTIMENT
- **KUWAITI DIALECT SUPPORT:** The system must accurately interpret Kuwaiti Arabic (Hadari & Badu).
- **CONTEXTUAL REVERSAL:** Some words may be negative in isolation (e.g., 'غلطة' - mistake) but positive in context (e.g., 'ولا غلطة' - flawless).
- **SPECIFIC TERMS:** 
  - Positive: 'ناطع', 'خنين', 'قوي حيل', 'بيضتوا الوجه', 'يبرد الجبد', 'من الآخر'.
  - Negative: 'مو شي', 'مو ذاك الزود', 'يلوع الجبد', 'دعاية على الفاضي'.
- **STRICT VALIDATION:** If the sentiment analysis engine is updated, always include these Kuwaiti-specific patterns in `src/lib/ai-engine.ts`.

## 5. PRODUCTION STABILITY & SCOPE RULES (LOCKED)
- **ARCHITECTURE LOCK:** Do NOT modify the build system (package.json scripts), server startup logic (server.ts entry point), or fundamental routing/caching layers.
- **PERFORMANCE GUARD:** Maintain the 2000ms debounce on the alert engine in `App.tsx` and the `manualChunks` optimization in `vite.config.ts`.
- **MINIMAL SCOPE:** Future iterations are restricted to:
  - Small UI/UX refinements.
  - Critical bug fixes.
  - No new heavy logic or architectural shifts.
- **RESOURCE AWARENESS:** All changes must respect the `RESOURCE_EXHAUSTED` limits by avoiding rapid polling or heavy build-time computations.

## 6. PURPOSE
This file serves as the permanent DNA for all future AI generations and developer interactions with this project. Adhere strictly to these rules.
