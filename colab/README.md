# Lumina — Specialty Psych Workers (Layer B)

This folder hosts the **big psychology LLMs** that can't run on HuggingFace's
free Serverless tier. They run on a free **Google Colab T4 GPU** and reach your
backend over an **ngrok** tunnel.

## The two-layer design

| Layer | Where it runs | Models | Role | Fails how |
|-------|---------------|--------|------|-----------|
| **A — always on** | HF Serverless (free) | 7 small classifiers (emotion, sentiment, suicidality, etc.) | The baseline. Every page always has *some* psych signal. | Cold-start ~10–20 s, then warm. Hidden by warmup-on-mount. |
| **B — best effort** | Colab T4 + ngrok | 4× 8B specialty LLMs | Deep DSM-5 / CBT / academic / diagnostic-justification analysis layered **on top of** Layer A. | If asleep/absent → silently skipped, Layer A still answers. |

**Key property: fail-soft.** Layer B is pure upgrade. If a Colab worker is down,
the page falls back to the Layer-A classifier + the primary Groq LLM. The user
never sees an error. So you can run **zero, one, or all four** workers — the app
works in every case.

## Model → page → env var map

| Page        | Layer-B model                            | `backend/.env` var        | What it adds |
|-------------|------------------------------------------|---------------------------|--------------|
| `/cbt`      | `GMLHUHE/PsyLLM-8B`                       | `COLAB_URL_PSYLLM`        | DSM-5/ICD-11 + CBT/ACT framing of the thought-record |
| `/chat`     | `Psychotherapy-LLM/PsyCoPref-Llama3-8B`  | `COLAB_URL_PSYCHOCOUNSEL` | Therapist-aligned critic that rewrites unsafe drafts (risk ≥ 1) |
| `/screening`| `aminabbasi/PsychoLexLLaMA-8B`           | `COLAB_URL_PSYCHOLEX`     | Academic-construct enrichment note for the summary |
| `/dashboard`| `klyang/MentaLLaMA-chat-7B`              | `COLAB_URL_MENTALLAMA`    | Interpretable `BECAUSE:` justifications over recent activity |

## Setup (per worker)

1. Open [`worker.ipynb`](./worker.ipynb) in Google Colab (free).
2. **Runtime → Change runtime type → T4 GPU.**
3. **Cell 1:** set `MODEL_ID` from the table and paste your free
   [ngrok authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).
4. **Runtime → Run all.** Wait ~3–5 min for load.
5. Copy the printed `https://....ngrok-free.app` URL.
6. Paste it into the matching `COLAB_URL_*` in `backend/.env`.
7. Restart the backend.

Run all four = open the notebook in **four Colab tabs**, one `MODEL_ID` each.

## Verify it's live

```bash
# health (replace URL)
curl https://YOUR.ngrok-free.app/health
# -> {"ok": true, "model": "GMLHUHE/PsyLLM-8B"}

# from the backend's own probe
curl http://localhost:8000/api/psych/health
# -> shows specialty.{psyllm,psychocounsel,psycholex,mentallama} = true/false
```

## The warmup story (why the 20 s cold-start is invisible)

The frontend calls `GET /api/psych/warmup/{page}` in each page's `onMount`
(`usePsychWarmup(page)`). That:

- fires the Layer-A HF classifier so it's warm by submit time, and
- pings the Layer-B Colab worker's `/health`.

The user spends 1+ minute reading / taking the test. The ~20 s warmup runs in
that window. By the time they submit, both layers are warm. Exactly the pattern
asked for.

## Gotchas

- **ngrok free** gives a *new* URL every notebook restart → re-paste into `.env`.
- **Colab idle timeout** (~90 min idle, ~12 h max) kills the worker → just
  re-run the notebook and re-paste. App keeps working (fail-soft) meanwhile.
- **One T4 = one 8B model** in 4-bit. Don't load two in one runtime.
- Set `ENABLE_SPECIALTY_PSYCH="false"` in `.env` to hard-disable Layer B and run
  on Layer A only (e.g. for a demo with no Colab tabs open).
