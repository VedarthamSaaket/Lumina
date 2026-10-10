from statistics import median
from typing import Optional


def _times(rounds: list[dict]) -> list[float]:
    return [float(r["time_ms"]) for r in rounds if isinstance(r.get("time_ms"), (int, float)) and r["time_ms"] > 0]


def _error_rate(rounds: list[dict]) -> float:
    return sum(1 for r in rounds if not r.get("correct")) / len(rounds) if rounds else 0.0


def _longest_streak(rounds: list[dict]) -> int:
    best = run = 0
    for r in rounds:
        run = run + 1 if r.get("correct") else 0
        best = max(best, run)
    return best


def _level_stats(rounds: list[dict]) -> tuple[Optional[int], Optional[int]]:
    by_level: dict[int, list[bool]] = {}
    for r in rounds:
        level = r.get("level")
        if isinstance(level, (int, float)):
            by_level.setdefault(int(level), []).append(bool(r.get("correct")))
    passed = [lvl for lvl, results in by_level.items() if any(results)]
    breaking = [lvl for lvl, results in by_level.items() if results.count(False) >= 2 or (results and not any(results))]
    return (max(passed) if passed else None, min(breaking) if breaking else None)


def analyse_session(rounds: list[dict], history: Optional[list[dict]] = None) -> dict:
    total = len(rounds)
    if total == 0:
        return {"total": 0, "flags": [], "lines": []}

    correct = sum(1 for r in rounds if r.get("correct"))
    accuracy = round(correct / total * 100)
    ceiling, breaking = _level_stats(rounds)
    flags: list[str] = []
    lines = [f"Accuracy {accuracy}% ({correct}/{total}), longest correct run {_longest_streak(rounds)}."]
    if ceiling is not None:
        lines.append(
            f"Highest level cleared: {ceiling}."
            + (f" Errors start stacking at level {breaking}." if breaking is not None else " No level produced repeated errors.")
        )
        if breaking is not None and accuracy < 90:
            flags.append("capacity_limit")

    if total >= 6:
        third = total // 3
        early, late = _error_rate(rounds[:third]), _error_rate(rounds[-third:])
        lines.append(f"Error rate first third {round(early * 100)}%, last third {round(late * 100)}%.")
        if late - early >= 0.3 and accuracy < 85:
            flags.append("late_decline")
        if early - late >= 0.3:
            flags.append("slow_start")

    times = _times(rounds)
    if len(times) >= 4:
        mid = median(times)
        half = len(times) // 2
        first, second = median(times[:half]), median(times[half:])
        spread = (max(times) - min(times)) / mid if mid else 0
        lines.append(
            f"Median response {round(mid)}ms (first half {round(first)}ms, second half {round(second)}ms), "
            f"spread {round(spread, 1)}x the median."
        )
        if second > first * 1.3:
            flags.append("slowing")
        if second < first * 0.75:
            flags.append("speeding_up")
        if spread >= 2.5:
            flags.append("uneven_pace")

        wrong = [float(r["time_ms"]) for r in rounds if not r.get("correct") and isinstance(r.get("time_ms"), (int, float)) and r["time_ms"] > 0]
        if len(wrong) >= 2:
            fast = sum(1 for t in wrong if t < mid * 0.7)
            slow = sum(1 for t in wrong if t > mid * 1.4)
            lines.append(f"Of {len(wrong)} timed errors, {fast} were much faster than usual and {slow} much slower.")
            if fast >= max(2, len(wrong) / 2):
                flags.append("rushed_errors")
            if slow >= max(2, len(wrong) / 2):
                flags.append("overloaded_errors")

    after_error = [rounds[i + 1] for i in range(total - 1) if not rounds[i].get("correct")]
    if len(after_error) >= 2:
        recovered = sum(1 for r in after_error if r.get("correct"))
        lines.append(f"After a miss, the next round was correct {recovered} of {len(after_error)} times.")
        if recovered / len(after_error) <= 0.34:
            flags.append("errors_cascade")
        elif recovered / len(after_error) >= 0.8:
            flags.append("recovers_well")

    modes: dict[str, list[bool]] = {}
    for r in rounds:
        if r.get("mode"):
            modes.setdefault(str(r["mode"]), []).append(bool(r.get("correct")))
    if len(modes) >= 2:
        parts = [f"{m} {round(sum(v) / len(v) * 100)}%" for m, v in modes.items() if len(v) >= 2]
        if parts:
            lines.append("Accuracy by mode: " + ", ".join(parts) + ".")

    if history:
        past_acc = [h["accuracy"] for h in history if h.get("accuracy") is not None]
        past_lvl = [h["max_level"] for h in history if h.get("max_level") is not None]
        if past_acc:
            avg = sum(past_acc) / len(past_acc)
            lines.append(f"Previous {len(past_acc)} session(s) of this game averaged {round(avg)}% accuracy.")
            if accuracy - avg >= 12:
                flags.append("improving")
            if avg - accuracy >= 15:
                flags.append("off_day")
        if len(past_lvl) >= 2 and ceiling is not None and all(lvl == ceiling for lvl in past_lvl[:2]):
            flags.append("plateau")
            lines.append(f"Highest level has stayed at {ceiling} for three sessions in a row.")
        gaps = [h["days_ago"] for h in history if h.get("days_ago") is not None]
        if gaps:
            lines.append(f"Last played this game {round(gaps[0], 1)} day(s) ago.")
            if gaps[0] >= 7:
                flags.append("long_gap")
            if gaps[0] < 0.2 and len(gaps) >= 2:
                flags.append("massed_practice")

    if accuracy >= 90 and not flags:
        flags.append("ready_for_harder")

    return {
        "total": total,
        "accuracy": accuracy,
        "correct": correct,
        "max_level": ceiling,
        "breaking_level": breaking,
        "flags": flags,
        "lines": lines,
    }


FLAG_MEANINGS = {
    "capacity_limit": "errors cluster at one level, which looks like a holding limit rather than carelessness",
    "late_decline": "accuracy dropped in the last third of the session",
    "slow_start": "the early rounds were the weak ones and performance settled afterwards",
    "slowing": "responses got clearly slower as the session went on",
    "speeding_up": "responses got clearly faster as the session went on",
    "uneven_pace": "response times swung widely from round to round",
    "rushed_errors": "most misses came on unusually quick answers",
    "overloaded_errors": "most misses came after unusually long pauses",
    "errors_cascade": "one miss tended to be followed by another",
    "recovers_well": "a miss was almost always followed by a correct round",
    "improving": "clearly better than this person's recent sessions of the same game",
    "off_day": "clearly below this person's recent sessions of the same game",
    "plateau": "the top level has not moved for three sessions",
    "long_gap": "a week or more since this game was last played",
    "massed_practice": "several sessions packed into the same few hours",
    "ready_for_harder": "a clean session with no weak spot, the task may be too easy now",
}


def analysis_block(analysis: dict) -> str:
    if not analysis.get("total"):
        return ""
    out = ["SESSION ANALYSIS (computed from the round log, treat these as facts and do not contradict them):"]
    out += [f"- {line}" for line in analysis["lines"]]
    if analysis["flags"]:
        out.append("Patterns detected:")
        out += [f"- {FLAG_MEANINGS[f]}" for f in analysis["flags"] if f in FLAG_MEANINGS]
    else:
        out.append("No notable pattern detected beyond the raw numbers. Do not invent one.")
    return "\n".join(out)
