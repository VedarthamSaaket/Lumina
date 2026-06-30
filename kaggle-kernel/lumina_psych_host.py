# Kaggle entrypoint: bootstrap deps + run the host.
#
# This file gets `kaggle kernels push`-ed by the backend's wake controller.
# Each push triggers a new GPU kernel run. The kernel installs deps, then
# imports and runs colab/kaggle_psych_host.py via `runpy`.
#
# Kaggle secrets that must be configured under the kernel:
#   LUMINA_BACKEND_URL         https://<your-deployed-backend>
#   SPECIALTY_REGISTRY_SECRET  <same as backend .env>
#   HF_TOKEN                   (optional, for gated repos)
#
# Settings → Accelerator: GPU T4 x2
# Settings → Internet:    On
import os
import subprocess
import sys
import urllib.request
import runpy

# 1. Install Python deps.
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q", "--upgrade",
    "fastapi", "uvicorn", "transformers", "accelerate",
    "bitsandbytes", "nest_asyncio", "requests", "pydantic",
])

# 2. Install cloudflared tunnel binary.
CF_BIN = "/usr/local/bin/cloudflared"
if not os.path.exists(CF_BIN):
    urllib.request.urlretrieve(
        "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64",
        CF_BIN,
    )
    os.chmod(CF_BIN, 0o755)

# 3. Pull the host script. The lifecycle controller can either bundle this
#    file alongside lumina_psych_host.py before pushing, or fetch it from
#    a public mirror. Simplest path: copy the body in at deploy time.
HOST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kaggle_psych_host.py")
if not os.path.exists(HOST_PATH):
    raise SystemExit(
        "kaggle_psych_host.py not found next to entrypoint. The backend's "
        "specialty_lifecycle.push expects both files in KAGGLE_KERNEL_DIR."
    )
runpy.run_path(HOST_PATH, run_name="__main__")
