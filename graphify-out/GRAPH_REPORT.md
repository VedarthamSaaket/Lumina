# Graph Report - Lumina  (2026-04-24)

## Corpus Check
- 69 files · ~43,289,301 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 348 nodes · 553 edges · 17 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 163 edges (avg confidence: 0.59)
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `User` - 28 edges
2. `InsightSummary` - 22 edges
3. `CognitiveTestResult` - 18 edges
4. `Conversation` - 14 edges
5. `ChatMessage` - 14 edges
6. `MoodLog` - 13 edges
7. `CrisisLog` - 12 edges
8. `MessageRequest` - 12 edges
9. `NewConversationRequest` - 12 edges
10. `JournalEntry` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Enforce basic password strength rules.` --uses--> `User`  [INFERRED]
  backend\routers\auth.py → backend\models\database.py
- `save_progress()` --calls--> `CBTProgress`  [INFERRED]
  backend\routers\cbt.py → backend\models\database.py
- `create_conversation()` --calls--> `Conversation`  [INFERRED]
  backend\routers\chat.py → backend\models\database.py
- `save_summary()` --calls--> `InsightSummary`  [INFERRED]
  backend\routers\dashboard.py → backend\models\database.py
- `save_orion_note()` --calls--> `InsightSummary`  [INFERRED]
  backend\routers\orion.py → backend\models\database.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (47): SigninRequest, SignupRequest, Base, BaseModel, ProgressSave, MessageRequest, NewConversationRequest, Build context string, honouring the context-toggle flags in settings. (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (15): middleware(), apiFetch(), calcScore(), clearChatHistory(), fetchSummary(), generateAiSummary(), generateCompletionSummary(), generateProfileSummary() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (20): _build_settings_prompt(), create_conversation(), get_chat_context(), _get_or_create_convo(), _get_user_context(), _get_user_settings(), send_message(), stream_message() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (16): delete_conversation(), get_conversation(), delete_summary(), generate_insight(), save_summary(), delete_entry(), generate_summary(), Verify that the authenticated user owns the requested resource.      Raises 404 (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (13): create_access_token(), get_current_user(), get_optional_user(), hash_password(), Enforce basic password strength rules., signin(), signup(), _validate_password_strength() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (5): makeDeceptiveWrongs(), tier1(), tier2(), tier3(), tier4()

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (10): getAuthHeader(), loadContent(), loadLocalContent(), pickRandom(), buildWelcome(), deleteConvo(), fmtDate(), fmtTime() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.3
Nodes (13): _build_orion_settings_prompt(), _call_groq(), _get_cognitive_context(), _get_orion_settings(), _get_orion_user_memory(), get_right_panel_content(), orion_debrief(), orion_live_event() (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (7): preloadScripts(), bootstrap(), handleSave(), loadEntries(), loadScript(), loop(), setSize()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (10): BaseHTTPMiddleware, _get_client_ip(), _get_rate_key(), _is_login_locked(), _is_rate_limited(), Increment abuse score for an IP and log it., Applies to every request:       1. Blocks permanently banned IPs       2. Enforc, Return the real client IP, respecting X-Forwarded-For from trusted proxies. (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.38
Nodes (6): get_pack_files(), _index_pack(), list_packs(), Recursively find all image files in a pack directory, returning relative paths., List all available sticker packs with file counts., Return a list of relative image file paths for a sticker pack.

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (3): BaseSettings, Config, Settings

### Community 13 - "Community 13"
Cohesion: 0.6
Nodes (3): calc_score(), get_severity(), submit_screening()

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (3): buildStickerUrl(), fetchPackIndex(), probePack()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (2): buildObservationMessage(), handleGameEvent()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): computeDetailedStats(), OrionDebrief()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (1): save_progress()

## Knowledge Gaps
- **14 isolated node(s):** `Config`, `Verify that the authenticated user owns the requested resource.      Raises 404`, `Filter a list to only return resources owned by the current user.     Logs any m`, `Return the real client IP, respecting X-Forwarded-For from trusted proxies.`, `Call this from auth router on bad credentials.` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (5 nodes): `OrionCompanion.tsx`, `buildObservationMessage()`, `getPalette()`, `handleGameEvent()`, `handleKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (5 nodes): `OrionDebrief.tsx`, `computeDetailedStats()`, `getAuthHeader()`, `OrionDebrief()`, `parseDebrief()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (4 nodes): `cbt.py`, `get_modules()`, `get_progress()`, `save_progress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `send_message()` connect `Community 2` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `start()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `User` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `User` (e.g. with `SignupRequest` and `SigninRequest`) actually correct?**
  _`User` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `InsightSummary` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`InsightSummary` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `CognitiveTestResult` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`CognitiveTestResult` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `Conversation` (e.g. with `MessageRequest` and `NewConversationRequest`) actually correct?**
  _`Conversation` has 12 INFERRED edges - model-reasoned connections that need verification._