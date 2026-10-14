import argparse
import json
import os
import random
import time
import zipfile

import numpy as np
import torch
from huggingface_hub import hf_hub_download
from transformers import AutoModelForSequenceClassification, AutoTokenizer

BASE = "j-hartmann/emotion-english-distilroberta-base"
NAMES = ["neutral", "anger", "disgust", "fear", "joy", "sadness", "surprise"]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "emotion")


def fetch(data_dir: str) -> None:
    for split in ("train", "validation", "test"):
        if os.path.isdir(os.path.join(data_dir, split)):
            continue
        path = hf_hub_download("roskoN/dailydialog", f"{split}.zip", repo_type="dataset", local_dir=data_dir)
        with zipfile.ZipFile(path) as z:
            z.extractall(data_dir)


def load(data_dir: str, split: str) -> list:
    texts = open(os.path.join(data_dir, split, f"dialogues_{split}.txt"), encoding="utf-8").read().strip().split("\n")
    emotions = open(os.path.join(data_dir, split, f"dialogues_emotion_{split}.txt")).read().strip().split("\n")
    dialogues = []
    for text, emo in zip(texts, emotions):
        turns = [u.strip() for u in text.split("__eou__") if u.strip()]
        labels = emo.split()
        if len(turns) == len(labels):
            dialogues.append((text.strip(), [(u, NAMES[int(l)]) for u, l in zip(turns, labels)]))
    return dialogues


def scores(gold: list, pred: list) -> dict:
    def f1(label: str) -> float:
        tp = sum(g == label and p == label for g, p in zip(gold, pred))
        fp = sum(g != label and p == label for g, p in zip(gold, pred))
        fn = sum(g == label and p != label for g, p in zip(gold, pred))
        return 2 * tp / max(1, 2 * tp + fp + fn)

    emo = NAMES[1:]
    tp = sum(g == p and g in emo for g, p in zip(gold, pred))
    fp = sum(p in emo and g != p for g, p in zip(gold, pred))
    fn = sum(g in emo and g != p for g, p in zip(gold, pred))
    counts = {n: gold.count(n) for n in NAMES}
    return {
        "accuracy": sum(g == p for g, p in zip(gold, pred)) / len(gold),
        "macro_f1": float(np.mean([f1(n) for n in NAMES])),
        "weighted_f1": sum(f1(n) * counts[n] for n in NAMES) / len(gold),
        "micro_f1_excl_neutral": 2 * tp / max(1, 2 * tp + fp + fn),
        "macro_f1_excl_neutral": float(np.mean([f1(n) for n in emo])),
    }


def predict(model, tok, data: list, device: str, bs: int = 128) -> list:
    model.eval()
    out = []
    with torch.no_grad():
        for i in range(0, len(data), bs):
            enc = tok([u for u, _ in data[i:i + bs]], truncation=True, max_length=96, padding=True, return_tensors="pt").to(device)
            out += model(**enc).logits.argmax(-1).cpu().tolist()
    return [model.config.id2label[p] for p in out]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=os.path.join(OUT + "_data"))
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--batch", type=int, default=32)
    args = ap.parse_args()

    fetch(args.data)
    test, val, train = load(args.data, "test"), load(args.data, "validation"), load(args.data, "train")
    held = {t for t, _ in test} | {t for t, _ in val}
    train = [d for d in train if d[0] not in held]
    flat = lambda dl: [u for _, turns in dl for u in turns]
    tr, va, te = flat(train), flat(val), flat(test)
    print(f"utterances train/val/test {len(tr)} {len(va)} {len(te)}", flush=True)

    device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(BASE)
    model = AutoModelForSequenceClassification.from_pretrained(BASE).to(device)
    l2i = model.config.label2id

    counts = np.bincount([l2i[l] for _, l in tr], minlength=len(l2i)).astype(float)
    weights = torch.tensor((counts.max() / np.maximum(counts, 1)) ** 0.5, dtype=torch.float).to(device)
    loss_fn = torch.nn.CrossEntropyLoss(weight=weights)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    steps = args.epochs * (len(tr) // args.batch)
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, s / (0.06 * steps)) * max(0.0, (steps - s) / steps))

    random.seed(0)
    best, history = -1.0, []
    for epoch in range(args.epochs):
        model.train()
        random.shuffle(tr)
        started = time.time()
        for i in range(0, len(tr) - args.batch + 1, args.batch):
            batch = tr[i:i + args.batch]
            enc = tok([u for u, _ in batch], truncation=True, max_length=96, padding=True, return_tensors="pt").to(device)
            y = torch.tensor([l2i[l] for _, l in batch]).to(device)
            loss = loss_fn(model(**enc).logits, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            sched.step()
            opt.zero_grad()
            if (i // args.batch) % 500 == 0:
                print(f"epoch {epoch} step {i // args.batch} loss {loss.item():.3f} {time.time() - started:.0f}s", flush=True)
        m = scores([l for _, l in va], predict(model, tok, va, device))
        history.append(m)
        print("validation", epoch, m, flush=True)
        if m["macro_f1"] > best:
            best = m["macro_f1"]
            model.save_pretrained(args.out)
            tok.save_pretrained(args.out)

    gold = [l for _, l in te]
    tuned = AutoModelForSequenceClassification.from_pretrained(args.out).to(device)
    base = AutoModelForSequenceClassification.from_pretrained(BASE).to(device)
    result = {"test_baseline": scores(gold, predict(base, tok, te, device)),
              "test_finetuned": scores(gold, predict(tuned, tok, te, device)),
              "validation_history": history}
    with open(os.path.join(args.out, "metrics.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
