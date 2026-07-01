# Graph Report - Lumina  (2026-07-01)

## Corpus Check
- 121 files · ~43,320,077 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 749 nodes · 1389 edges · 58 communities detected
- Extraction: 58% EXTRACTED · 42% INFERRED · 0% AMBIGUOUS · INFERRED: 582 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]

## God Nodes (most connected - your core abstractions)
1. `User` - 77 edges
2. `InsightSummary` - 63 edges
3. `CognitiveTestResult` - 58 edges
4. `MoodLog` - 31 edges
5. `OrionConversation` - 31 edges
6. `OrionMessage` - 31 edges
7. `JournalEntry` - 29 edges
8. `ScreeningResult` - 29 edges
9. `CBTProgress` - 29 edges
10. `Conversation` - 22 edges

## Surprising Connections (you probably didn't know these)
- `MoodLog` --calls--> `log_mood()`  [INFERRED]
  backend\models\database.py → backend\routers\mood.py
- `CrisisLog` --calls--> `log_crisis()`  [INFERRED]
  backend\models\database.py → backend\routers\crisis.py
- `Conversation` --calls--> `create_conversation()`  [INFERRED]
  backend\models\database.py → backend\routers\chat.py
- `InsightSummary` --calls--> `save_summary()`  [INFERRED]
  backend\models\database.py → backend\routers\dashboard.py
- `InsightSummary` --calls--> `save_orion_note()`  [INFERRED]
  backend\models\database.py → backend\routers\orion.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (67): ProgressSave, save_progress(), _build_settings_prompt(), create_conversation(), get_chat_context(), _get_or_create_convo(), _get_user_context(), _get_user_settings() (+59 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (70): Base, MessageRequest, NewConversationRequest, Build context string, honouring the context-toggle flags in settings., Build context string, honouring the context-toggle flags in settings., Build context string, honouring the context-toggle flags in settings., Return the context Lumina would inject into a chat session (for the memory viewe, Return the context Lumina would inject into a chat session (for the memory viewe (+62 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (41): create_access_token(), forgot_password(), ForgotPasswordRequest, _generate_code(), get_current_user(), get_optional_user(), hash_password(), Step 2 of signup. Confirms the code, creates the real account, signs in. (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (40): Add new columns to existing tables if they are missing (safe to call repeatedly), run_migrations(), _build_messages(), build_user_context(), chat_with_llama(), chat_with_llama_stream(), close_http_client(), _format_memory_game_context() (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (37): _call_worker(), _enabled(), health_check(), mentallama_dashboard_justify(), psychocounsel_critic(), psycholex_screening_enrich(), psyllm_cbt_analyze(), Tell the resolved worker to start loading model_key into VRAM right now,     wi (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (19): submit(), apiFetch(), generateGptSummary(), generateMemorySummary(), getToken(), saveMemoryResult(), generateFold(), submit() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (19): _bnb_4bit(), infer(), InferBody, _load(), _on_startup(), Lightning AI Studio host for Lumina's psych specialty layer.  Runs in a Lightnin, Kick off a background load for one model without blocking on it — lets     the b, warm() (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (22): BaseHTTPMiddleware, delete_conversation(), get_conversation(), delete_summary(), save_summary(), create_entry(), delete_entry(), Verify that the authenticated user owns the requested resource.      Raises 404 (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (26): _check(), Internal endpoint workers ping on startup to self-report their public URL.  Auth, Worker calls this immediately before self-exiting on idle. We record     the upt, register(), RegisterBody, shutdown(), ShutdownBody, snapshot() (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (10): getAuthHeader(), loadContent(), loadLocalContent(), pickRandom(), buildWelcome(), deleteConvo(), fmtDate(), fmtTime() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (7): apiFetch(), clearChatHistory(), fetchSummary(), generateProfileSummary(), getToken(), load(), loadSettings()

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (14): _bnb_4bit(), _bootstrap(), _idle_watchdog(), infer(), InferBody, _load_one(), _preload_all(), Notify backend so it can deduct uptime from the weekly quota counter     and cle (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (13): _bnb_4bit(), _bootstrap(), _idle_watchdog(), infer(), InferBody, _load_one(), _preload_all(), Kaggle notebook host for Lumina's psych specialty layer.  Runs in a Kaggle Noteb (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.26
Nodes (12): _code_block(), Send transactional email. Uses Brevo's HTTP API when BREVO_API_KEY is     confi, Wrap content in the Lumina chat-page (light parchment) aesthetic.      Backgro, The code chip, in EB Garamond like the rest of the email., Send via the Brevo (Sendinblue) transactional HTTP API. Preferred over     SMTP, Send a single email via Gmail SMTP. Returns True on success.      Retries once, send_email(), send_password_reset_email() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (4): FieldLabel(), onResend(), onStep2(), onSubmit()

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): BaseSettings, Config, Warn on insecure secrets in dev; refuse to boot in production.     Production i, Settings, _validate_secrets()

### Community 19 - "Community 19"
Cohesion: 0.47
Nodes (5): clear_chat_history(), _defaults(), get_settings(), save_settings(), UserSettings

### Community 22 - "Community 22"
Cohesion: 0.6
Nodes (3): buildStickerUrl(), fetchPackIndex(), probePack()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (2): buildObservationMessage(), handleGameEvent()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (2): computeDetailedStats(), OrionDebrief()

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (2): loadScript(), loadThreeAndGLTF()

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (2): isPuzzleId(), ResultScreen()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (1): Shape()

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): Send a single email via Gmail SMTP. Returns True on success.      Retries once o

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): Wrap content in the Lumina chat-page (light parchment) aesthetic.      Backgroun

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): The code chip, in EB Garamond like the rest of the email.

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): Return the real client IP, respecting X-Forwarded-For from trusted proxies.

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): Call this from auth router on bad credentials.

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): Increment abuse score for an IP and log it.

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Applies to every request:       1. Blocks permanently banned IPs       2. Enforc

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Combined snapshot — useful in the settings page or a dev dashboard.

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Recursively find all image files in a pack directory, returning relative paths.

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): List all available sticker packs with file counts.

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Return a list of relative image file paths for a sticker pack.

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Non-streaming summary - used by screening page.

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Streaming summary - streams tokens as they arrive.

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): Combine the keyword risk detector with the HF suicide-ideation classifier     (

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): Back-compat wrapper. Prefer `detect_risk_full` when you need the     continuous

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): Run several classifier calls concurrently. Order preserved.

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Return every label, sorted high-to-low. Spectrum view, no truncation.

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): Render the full distribution as a compact prompt-friendly string.

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): Return score for the first label whose name contains label_substr (case-insensit

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Critique the primary chat draft against therapist decision-making norms.     Ret

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): Call a HuggingFace text-classification model and return the standard     [{label

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): Run several classifier calls concurrently. Order preserved.

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): Return score for the first label whose name contains label_substr (case-insensit

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (1): Pre-classify a chat message and return a PSYCH_SIGNAL block to inject.

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): Return up to 3 emotion labels (GoEmotions, 28-class) suitable for tags.

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (1): Run a mental-health-domain classifier over the user's reframing /     distortion

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): Binary suicide-ideation classifier. Returns probability 0..1.     Used to AUGMEN

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): Map a 0..1 suicidality probability onto Lumina's 0-3 risk_level scale.

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (1): 4-class Twitter emotion classifier (anger / joy / optimism / sadness).     Lets

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (1): Classifier over the dashboard's already-aggregated user text (mood notes,     sc

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (1): Pull the system message out and convert the rest to Gemini Content objects.

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (1): Stream text deltas back from Gemini. Mirrors chat_with_llama_stream's shape.

### Community 113 - "Community 113"
Cohesion: 1.0
Nodes (1): Non-streaming fallback. Mirrors chat_with_llama's shape.

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (1): Wrap content in the Lumina auth-card aesthetic.      The outer background recrea

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): The big gold-shimmer code chip, spaced for legibility.

## Knowledge Gaps
- **102 isolated node(s):** `Config`, `Warn on insecure secrets in dev; refuse to boot in production.     Production i`, `Send via the Brevo (Sendinblue) transactional HTTP API. Preferred over     SMTP`, `Send a single email via Gmail SMTP. Returns True on success.      Retries once`, `Send transactional email. Uses Brevo's HTTP API when BREVO_API_KEY is     confi` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 24`** (5 nodes): `OrionCompanion.tsx`, `buildObservationMessage()`, `getPalette()`, `handleGameEvent()`, `handleKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (5 nodes): `OrionDebrief.tsx`, `computeDetailedStats()`, `getAuthHeader()`, `OrionDebrief()`, `parseDebrief()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `getIsCancelled()`, `loadScript()`, `loadThreeAndGLTF()`, `BookScene.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `isPuzzleId()`, `ResultScreen.tsx`, `constants.ts`, `ResultScreen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `Shape.tsx`, `Shape.tsx`, `Shape()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `Send a single email via Gmail SMTP. Returns True on success.      Retries once o`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `Wrap content in the Lumina chat-page (light parchment) aesthetic.      Backgroun`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `The code chip, in EB Garamond like the rest of the email.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `Return the real client IP, respecting X-Forwarded-For from trusted proxies.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `Call this from auth router on bad credentials.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `Increment abuse score for an IP and log it.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Applies to every request:       1. Blocks permanently banned IPs       2. Enforc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Combined snapshot — useful in the settings page or a dev dashboard.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Recursively find all image files in a pack directory, returning relative paths.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `List all available sticker packs with file counts.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Return a list of relative image file paths for a sticker pack.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Non-streaming summary - used by screening page.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Streaming summary - streams tokens as they arrive.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `Combine the keyword risk detector with the HF suicide-ideation classifier     (`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `Back-compat wrapper. Prefer `detect_risk_full` when you need the     continuous`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Run several classifier calls concurrently. Order preserved.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Return every label, sorted high-to-low. Spectrum view, no truncation.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `Render the full distribution as a compact prompt-friendly string.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Return score for the first label whose name contains label_substr (case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Critique the primary chat draft against therapist decision-making norms.     Ret`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `Call a HuggingFace text-classification model and return the standard     [{label`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `Run several classifier calls concurrently. Order preserved.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `Return score for the first label whose name contains label_substr (case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `Pre-classify a chat message and return a PSYCH_SIGNAL block to inject.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `Return up to 3 emotion labels (GoEmotions, 28-class) suitable for tags.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (1 nodes): `Run a mental-health-domain classifier over the user's reframing /     distortion`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Binary suicide-ideation classifier. Returns probability 0..1.     Used to AUGMEN`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `Map a 0..1 suicidality probability onto Lumina's 0-3 risk_level scale.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `4-class Twitter emotion classifier (anger / joy / optimism / sadness).     Lets`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `Classifier over the dashboard's already-aggregated user text (mood notes,     sc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `Pull the system message out and convert the rest to Gemini Content objects.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `Stream text deltas back from Gemini. Mirrors chat_with_llama_stream's shape.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `Non-streaming fallback. Mirrors chat_with_llama's shape.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `Wrap content in the Lumina auth-card aesthetic.      The outer background recrea`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `The big gold-shimmer code chip, spaced for legibility.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `send_message()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `User` connect `Community 1` to `Community 0`, `Community 2`, `Community 19`, `Community 4`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `utcnow()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 75 inferred relationships involving `User` (e.g. with `SignupRequest` and `VerifyEmailRequest`) actually correct?**
  _`User` has 75 INFERRED edges - model-reasoned connections that need verification._
- **Are the 61 inferred relationships involving `InsightSummary` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`InsightSummary` has 61 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `CognitiveTestResult` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`CognitiveTestResult` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 29 inferred relationships involving `MoodLog` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`MoodLog` has 29 INFERRED edges - model-reasoned connections that need verification._