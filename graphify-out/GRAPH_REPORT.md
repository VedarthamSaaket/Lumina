# Graph Report - Lumina  (2026-06-30)

## Corpus Check
- 114 files · ~43,309,352 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 594 nodes · 1052 edges · 37 communities detected
- Extraction: 59% EXTRACTED · 41% INFERRED · 0% AMBIGUOUS · INFERRED: 434 edges (avg confidence: 0.59)
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
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 80|Community 80]]
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

## God Nodes (most connected - your core abstractions)
1. `User` - 61 edges
2. `InsightSummary` - 46 edges
3. `CognitiveTestResult` - 42 edges
4. `OrionConversation` - 25 edges
5. `OrionMessage` - 25 edges
6. `Conversation` - 22 edges
7. `ChatMessage` - 22 edges
8. `MoodLog` - 21 edges
9. `CrisisLog` - 20 edges
10. `JournalEntry` - 19 edges

## Surprising Connections (you probably didn't know these)
- `require_owner()` --calls--> `delete_summary()`  [INFERRED]
  backend\middleware\ownership.py → backend\routers\dashboard.py
- `MoodLog` --calls--> `log_mood()`  [INFERRED]
  backend\models\database.py → backend\routers\mood.py
- `CrisisLog` --calls--> `log_crisis()`  [INFERRED]
  backend\models\database.py → backend\routers\crisis.py
- `Conversation` --calls--> `create_conversation()`  [INFERRED]
  backend\models\database.py → backend\routers\chat.py
- `InsightSummary` --calls--> `save_summary()`  [INFERRED]
  backend\models\database.py → backend\routers\dashboard.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (58): Base, MessageRequest, NewConversationRequest, Build context string, honouring the context-toggle flags in settings., Build context string, honouring the context-toggle flags in settings., Build context string, honouring the context-toggle flags in settings., Return the context Lumina would inject into a chat session (for the memory viewe, Return the context Lumina would inject into a chat session (for the memory viewe (+50 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (35): create_access_token(), forgot_password(), ForgotPasswordRequest, _generate_code(), get_current_user(), get_optional_user(), hash_password(), Step 2 of signup. Confirms the code, creates the real account, signs in. (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (19): submit(), apiFetch(), generateGptSummary(), generateMemorySummary(), getToken(), saveMemoryResult(), generateFold(), submit() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (34): _build_settings_prompt(), create_conversation(), delete_conversation(), get_chat_context(), get_conversation(), _get_or_create_convo(), _get_user_context(), _get_user_settings() (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (15): middleware(), apiFetch(), calcScore(), clearChatHistory(), fetchSummary(), generateAiSummary(), generateCompletionSummary(), generateProfileSummary() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (34): _augment_enabled(), _cache_get(), _cache_key(), _cache_put(), find_label(), format_spectrum(), full_distribution(), hf_classify() (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (22): ProgressSave, save_progress(), _call_worker(), _enabled(), health_check(), mentallama_dashboard_justify(), psychocounsel_critic(), psycholex_screening_enrich() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.2
Nodes (21): _build_orion_settings_prompt(), _build_right_panel_prompt(), _call_groq(), _get_cognitive_context(), _get_or_create_conversation(), _get_orion_settings(), _get_orion_user_memory(), get_right_panel_content() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (14): BaseHTTPMiddleware, Filter a list to only return resources owned by the current user.     Logs any m, require_owner_bulk(), _get_client_ip(), _get_rate_key(), _is_login_locked(), _is_rate_limited(), Call this from auth router on bad credentials. (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (10): getAuthHeader(), loadContent(), loadLocalContent(), pickRandom(), buildWelcome(), deleteConvo(), fmtDate(), fmtTime() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (9): delete_summary(), generate_insight(), save_summary(), generate_summary(), get_summary(), Non-streaming summary - used by screening page., Streaming summary - streams tokens as they arrive., stream_summary() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (4): FieldLabel(), onResend(), onStep2(), onSubmit()

### Community 12 - "Community 12"
Cohesion: 0.39
Nodes (8): _code_block(), The code chip, in EB Garamond like the rest of the email., Send a single email via Gmail SMTP. Returns True on success.      Retries once o, Wrap content in the Lumina chat-page (light parchment) aesthetic.      Backgroun, send_email(), send_password_reset_email(), send_verification_email(), _shell()

### Community 16 - "Community 16"
Cohesion: 0.38
Nodes (6): get_pack_files(), _index_pack(), list_packs(), Recursively find all image files in a pack directory, returning relative paths., List all available sticker packs with file counts., Return a list of relative image file paths for a sticker pack.

### Community 17 - "Community 17"
Cohesion: 0.47
Nodes (5): clear_chat_history(), _defaults(), get_settings(), save_settings(), UserSettings

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (3): BaseSettings, Config, Settings

### Community 21 - "Community 21"
Cohesion: 0.6
Nodes (3): buildStickerUrl(), fetchPackIndex(), probePack()

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (2): buildObservationMessage(), handleGameEvent()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (2): computeDetailedStats(), OrionDebrief()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): loadScript(), loadThreeAndGLTF()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): isPuzzleId(), ResultScreen()

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (1): Shape()

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): Call a HuggingFace text-classification model and return the standard     [{label

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): Run several classifier calls concurrently. Order preserved.

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): Return score for the first label whose name contains label_substr (case-insensit

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): Pre-classify a chat message and return a PSYCH_SIGNAL block to inject.

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): Return up to 3 emotion labels (GoEmotions, 28-class) suitable for tags.

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): Run a mental-health-domain classifier over the user's reframing /     distortion

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): Binary suicide-ideation classifier. Returns probability 0..1.     Used to AUGMEN

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Map a 0..1 suicidality probability onto Lumina's 0-3 risk_level scale.

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): 4-class Twitter emotion classifier (anger / joy / optimism / sadness).     Lets

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Classifier over the dashboard's already-aggregated user text (mood notes,     sc

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): Pull the system message out and convert the rest to Gemini Content objects.

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Stream text deltas back from Gemini. Mirrors chat_with_llama_stream's shape.

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Non-streaming fallback. Mirrors chat_with_llama's shape.

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Wrap content in the Lumina auth-card aesthetic.      The outer background recrea

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): The big gold-shimmer code chip, spaced for legibility.

## Knowledge Gaps
- **56 isolated node(s):** `Config`, `Send a single email via Gmail SMTP. Returns True on success.      Retries once o`, `Wrap content in the Lumina chat-page (light parchment) aesthetic.      Backgroun`, `The code chip, in EB Garamond like the rest of the email.`, `Verify that the authenticated user owns the requested resource.      Raises 404` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 23`** (5 nodes): `OrionCompanion.tsx`, `buildObservationMessage()`, `getPalette()`, `handleGameEvent()`, `handleKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `OrionDebrief.tsx`, `computeDetailedStats()`, `getAuthHeader()`, `OrionDebrief()`, `parseDebrief()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `getIsCancelled()`, `loadScript()`, `loadThreeAndGLTF()`, `BookScene.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `isPuzzleId()`, `ResultScreen.tsx`, `constants.ts`, `ResultScreen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `Shape.tsx`, `Shape.tsx`, `Shape()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `Call a HuggingFace text-classification model and return the standard     [{label`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `Run several classifier calls concurrently. Order preserved.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `Return score for the first label whose name contains label_substr (case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `Pre-classify a chat message and return a PSYCH_SIGNAL block to inject.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `Return up to 3 emotion labels (GoEmotions, 28-class) suitable for tags.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `Run a mental-health-domain classifier over the user's reframing /     distortion`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `Binary suicide-ideation classifier. Returns probability 0..1.     Used to AUGMEN`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Map a 0..1 suicidality probability onto Lumina's 0-3 risk_level scale.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `4-class Twitter emotion classifier (anger / joy / optimism / sadness).     Lets`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Classifier over the dashboard's already-aggregated user text (mood notes,     sc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `Pull the system message out and convert the rest to Gemini Content objects.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Stream text deltas back from Gemini. Mirrors chat_with_llama_stream's shape.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Non-streaming fallback. Mirrors chat_with_llama's shape.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Wrap content in the Lumina auth-card aesthetic.      The outer background recrea`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `The big gold-shimmer code chip, spaced for legibility.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `send_message()` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `utcnow()` connect `Community 1` to `Community 0`, `Community 10`, `Community 3`, `Community 7`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `start()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 59 inferred relationships involving `User` (e.g. with `SignupRequest` and `VerifyEmailRequest`) actually correct?**
  _`User` has 59 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `InsightSummary` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`InsightSummary` has 44 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `CognitiveTestResult` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`CognitiveTestResult` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `OrionConversation` (e.g. with `OrionMessageRequest` and `LiveEventRequest`) actually correct?**
  _`OrionConversation` has 23 INFERRED edges - model-reasoned connections that need verification._