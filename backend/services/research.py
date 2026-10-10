import re

EVIDENCE = [
    {
        "cite": "Miller (1956), Psychological Review",
        "finding": "People hold only a handful of separate items in mind at once, but grouping items into meaningful chunks lets the same capacity carry far more.",
        "apply": "When a sequence outgrows the person's span, coach grouping it into two or three chunks instead of holding single items.",
        "tags": ["chunk", "span", "digits", "sequence", "capacity", "remember numbers"],
        "flags": ["capacity_limit", "plateau"],
        "games": ["digit", "letter", "color", "word"],
    },
    {
        "cite": "Cowan (2001), Behavioral and Brain Sciences",
        "finding": "When rehearsal and grouping are prevented, working memory capacity is closer to about four chunks than seven.",
        "apply": "Treat stalling around four or five items as a normal human limit, and move the person to strategy rather than effort.",
        "tags": ["capacity", "working memory", "limit", "four", "span"],
        "flags": ["capacity_limit"],
        "games": ["digit", "letter", "spatial", "color"],
    },
    {
        "cite": "Baddeley and Hitch (1974), working memory model",
        "finding": "Working memory has separate verbal and visual-spatial stores coordinated by an attention system, so a verbal task and a spatial task draw on partly different resources.",
        "apply": "Explain why someone can be strong at number sequences and weaker at grid patterns, and suggest recoding (naming positions, picturing digits) to borrow the stronger store.",
        "tags": ["working memory", "verbal", "spatial", "visual", "grid", "good at", "bad at", "better at", "worse at", "numbers but", "different games"],
        "flags": [],
        "games": ["digit", "letter", "spatial", "spatial_reverse", "color"],
    },
    {
        "cite": "Ericsson, Chase and Faloon (1980), Science",
        "finding": "A student with an ordinary digit span raised it from 7 to about 80 digits over roughly 230 hours of practice by recoding digits into familiar running times. The gain did not carry over to letters.",
        "apply": "Show that span grows through a personal encoding scheme, and that the skill is specific to the material practised.",
        "tags": ["digit span", "improve memory", "practice", "numbers", "encoding", "mnemonic"],
        "flags": ["plateau", "capacity_limit"],
        "games": ["digit", "letter"],
    },
    {
        "cite": "Roediger and Karpicke (2006), Psychological Science",
        "finding": "Students who practised recalling a text remembered more a week later than students who reread it, even though rereading felt more effective at the time.",
        "apply": "Recommend recalling from memory before checking, in study and in the games, and warn that effortful recall feels worse than it works.",
        "tags": ["study", "exam", "revise", "testing", "recall", "reread", "learn", "remember"],
        "flags": [],
        "games": ["word"],
    },
    {
        "cite": "Cepeda and colleagues (2006), Psychological Bulletin",
        "finding": "A review of several hundred experiments found that spreading practice over time produces better long-term retention than the same amount of practice packed together.",
        "apply": "Favour short sessions on separate days over one long sitting, and say so when sessions are bunched or far apart.",
        "tags": ["spacing", "how often", "schedule", "cram", "daily", "practice", "routine", "study"],
        "flags": ["massed_practice", "long_gap"],
        "games": [],
    },
    {
        "cite": "Rohrer and Taylor (2007), Instructional Science",
        "finding": "Mixing different problem types within a practice session led to much better later test performance than practising one type at a time, despite worse performance during practice.",
        "apply": "Suggest alternating two different games in a sitting rather than repeating one.",
        "tags": ["interleav", "mix", "variety", "which game", "order", "math"],
        "flags": ["plateau"],
        "games": ["math", "series", "matrix"],
    },
    {
        "cite": "Bjork (1994), desirable difficulties",
        "finding": "Conditions that make practice feel harder and slower, such as spacing, variation and self-testing, often produce stronger long-term learning than conditions that feel smooth.",
        "apply": "Reframe a session with errors at a harder level as productive, and steer away from staying where it feels easy.",
        "tags": ["hard", "difficult", "struggle", "easy", "frustrat", "failing", "getting worse"],
        "flags": ["ready_for_harder", "off_day"],
        "games": [],
    },
    {
        "cite": "Ericsson, Krampe and Tesch-Romer (1993), Psychological Review",
        "finding": "Expert performance was tied to accumulated deliberate practice: focused work on specific weaknesses just beyond current ability, with feedback.",
        "apply": "Point practice at the exact level or mode where errors start, not at comfortable levels.",
        "tags": ["improve", "get better", "practice", "talent", "plateau", "stuck", "expert"],
        "flags": ["plateau", "capacity_limit"],
        "games": [],
    },
    {
        "cite": "Jaeggi and colleagues (2008), PNAS",
        "finding": "Adults who trained on a demanding dual n-back task improved on an untrained reasoning test, with larger gains after more training days.",
        "apply": "Mention as the hopeful side of brain training, always paired with the later reviews that failed to confirm broad transfer.",
        "tags": ["brain training", "iq", "smarter", "intelligence", "transfer", "does this work", "n-back"],
        "flags": [],
        "games": [],
    },
    {
        "cite": "Owen and colleagues (2010), Nature",
        "finding": "In a six-week online study of over 11,000 people, participants improved on the tasks they trained but showed no meaningful transfer to untrained tasks.",
        "apply": "Be honest that getting better at a game mostly means getting better at that game, and that real-world benefit needs applying the strategy outside it.",
        "tags": ["brain training", "does this work", "transfer", "smarter", "iq", "real life", "pointless"],
        "flags": [],
        "games": [],
    },
    {
        "cite": "Melby-Lervag and Hulme (2013), Developmental Psychology",
        "finding": "A meta-analysis found working memory training gives short-term gains on closely related tasks, with no convincing evidence of lasting gains in general reasoning or attainment.",
        "apply": "Set expectations: these games sharpen specific skills and strategies, not general intelligence.",
        "tags": ["brain training", "transfer", "iq", "intelligence", "does this work", "smarter"],
        "flags": [],
        "games": [],
    },
    {
        "cite": "Simons and colleagues (2016), Psychological Science in the Public Interest",
        "finding": "A large review concluded that brain-training programs improve the trained tasks, give weaker evidence for closely related tasks, and little evidence for everyday cognitive benefits.",
        "apply": "Use when someone asks whether these games will change daily life, and direct them to strategy use, sleep and exercise as the better-supported levers.",
        "tags": ["brain training", "does this work", "real life", "everyday", "worth it"],
        "flags": [],
        "games": [],
    },
    {
        "cite": "Uttal and colleagues (2013), Psychological Bulletin",
        "finding": "A meta-analysis of over 200 studies found spatial skills are trainable, the gains last, and they transfer to other spatial tasks that were not trained.",
        "apply": "Encourage the spatial games as one of the areas where practice has the best evidence of carrying over.",
        "tags": ["spatial", "rotation", "folding", "visualis", "maps", "geometry"],
        "flags": [],
        "games": ["spatial", "spatial_reverse", "paperfold"],
    },
    {
        "cite": "Carpenter, Just and Shell (1990), Psychological Review",
        "finding": "Performance on Raven-style matrix puzzles depended largely on how many rules a person could find and keep track of at once, more than on any single insight.",
        "apply": "Coach matrix and series puzzles by naming one rule at a time (shape, then count, then rotation) and checking each against the options.",
        "tags": ["matrix", "pattern", "reasoning", "puzzle", "rule", "logic"],
        "flags": ["capacity_limit", "overloaded_errors"],
        "games": ["matrix", "series", "oddoneout"],
    },
    {
        "cite": "Gentner (1983), Cognitive Science",
        "finding": "Analogies work by mapping the relationships between things, not their surface features, and people are often misled by surface similarity.",
        "apply": "In analogy puzzles, have the person say the relation in words (\"gets bigger\", \"rotates a quarter turn\") before looking at the answers.",
        "tags": ["analogy", "relation", "similar", "compare"],
        "flags": ["rushed_errors"],
        "games": ["analogy"],
    },
    {
        "cite": "Sweller (1988), Cognitive Science",
        "finding": "Problem solving can overload working memory and leave little capacity for learning; reducing unnecessary load frees capacity for the task itself.",
        "apply": "When errors follow long pauses, simplify: one rule at a time, say steps aloud, or externalise part of the problem.",
        "tags": ["overwhelm", "too much", "overload", "confus", "complex", "study"],
        "flags": ["overloaded_errors", "capacity_limit"],
        "games": ["matrix", "math", "series"],
    },
    {
        "cite": "Heitz (2014), Frontiers in Neuroscience",
        "finding": "Speed and accuracy trade off against each other in almost every decision task: responding faster reliably costs accuracy, and people can shift the balance deliberately.",
        "apply": "When misses come on quick answers, ask for a deliberate half-second longer on each round and watch whether accuracy returns.",
        "tags": ["rush", "fast", "speed", "careless", "impuls", "slow down", "time"],
        "flags": ["rushed_errors", "speeding_up"],
        "games": [],
    },
    {
        "cite": "Rabbitt (1966), Journal of Experimental Psychology",
        "finding": "People naturally slow down on the response right after an error, an early demonstration that the mind monitors its own mistakes.",
        "apply": "Normalise slowing after a miss as the system recalibrating, and encourage one slower, careful round after each error.",
        "tags": ["mistake", "error", "after i get one wrong", "spiral", "tilt"],
        "flags": ["errors_cascade", "recovers_well"],
        "games": [],
    },
    {
        "cite": "Beilock and Carr (2005), Psychological Science",
        "finding": "Under pressure, people with high working memory capacity lost the most on demanding maths problems, because worry consumed the capacity they normally relied on.",
        "apply": "When a strong player has an off session under stress, explain that pressure taxes exactly the resource the game uses.",
        "tags": ["pressure", "choke", "nervous", "exam", "anxious", "stress", "interview"],
        "flags": ["off_day", "errors_cascade"],
        "games": ["math"],
    },
    {
        "cite": "Ramirez and Beilock (2011), Science",
        "finding": "Students who spent ten minutes writing about their worries just before a high-stakes exam performed better than those who did not, especially those prone to test anxiety.",
        "apply": "Suggest a short worry-dump in the journal before an exam or a demanding session.",
        "tags": ["exam", "test anxiety", "nervous", "worry", "pressure", "interview"],
        "flags": [],
        "games": [],
    },
    {
        "cite": "Eysenck and colleagues (2007), attentional control theory, Emotion",
        "finding": "Anxiety impairs the efficient control of attention, making it harder to ignore distractions and switch focus, often before it lowers raw accuracy.",
        "apply": "Read slower, effortful performance on an anxious day as attention being pulled away, not as lost ability.",
        "tags": ["anxiety", "anxious", "worry", "worried", "panic", "nervous", "on edge", "distract", "cant concentrate"],
        "flags": ["off_day", "uneven_pace", "slowing"],
        "games": [],
    },
    {
        "cite": "Arnsten (2009), Nature Reviews Neuroscience",
        "finding": "Even mild uncontrollable stress rapidly weakens the prefrontal functions behind working memory and flexible thinking, through stress-chemical signalling.",
        "apply": "Explain a bad session on a stressful day as a reversible state effect, and suggest a calmer time rather than pushing harder.",
        "tags": ["stress", "stressed", "pressure", "bad day", "brain fog", "overwhelmed", "burnout", "burnt out"],
        "flags": ["off_day"],
        "games": [],
    },
    {
        "cite": "Rock and colleagues (2014), Psychological Medicine",
        "finding": "A meta-analysis found that depression is associated with moderate deficits in executive function, memory and attention, some of which persist after mood improves.",
        "apply": "If someone going through a low period notices slower thinking, tell them this is a recognised effect of low mood, not a sign they are losing ability, and point them warmly to Lumina.",
        "tags": ["depress", "low mood", "feeling low", "really low", "feel low", "sad", "foggy", "fog", "brain feels", "slow thinking", "cant think", "motivation"],
        "flags": [],
        "games": [],
    },
    {
        "cite": "Joormann and Gotlib (2008), Journal of Abnormal Psychology",
        "finding": "People with depression had more difficulty removing negative material that was no longer relevant from working memory.",
        "apply": "Explain that looping thoughts occupy working memory space, which is why focus drops when the mind keeps returning to something painful.",
        "tags": ["ruminat", "overthink", "cant stop thinking", "looping", "intrusive", "stuck in my head"],
        "flags": [],
        "games": [],
    },
    {
        "cite": "Martinussen and colleagues (2005), Journal of the American Academy of Child and Adolescent Psychiatry",
        "finding": "A meta-analysis found that children with ADHD show working memory impairments, larger for spatial than for verbal material.",
        "apply": "If the person mentions ADHD, treat uneven or spatial-specific difficulty as consistent with the literature, suggest external supports, and never suggest or question a diagnosis.",
        "tags": ["adhd", "attention deficit", "inattent", "hyperactiv"],
        "flags": [],
        "games": ["spatial", "spatial_reverse"],
    },
    {
        "cite": "Lim and Dinges (2010), Psychological Bulletin",
        "finding": "A meta-analysis found that short-term sleep deprivation impairs most cognitive functions, with the largest effects on sustained attention and lapses.",
        "apply": "Ask about sleep when response times are erratic or accuracy fades late in a session.",
        "tags": ["sleep", "slept", "tired", "exhaust", "insomnia", "late night", "all-nighter", "no rest"],
        "flags": ["late_decline", "uneven_pace", "slowing", "off_day"],
        "games": [],
    },
    {
        "cite": "Stickgold (2005), Nature",
        "finding": "Sleep after learning strengthens and reorganises new memories; skills practised before sleep often improve by the next day without further practice.",
        "apply": "Suggest practising earlier in the evening and judging progress the next day, not at the end of a tired session.",
        "tags": ["sleep", "consolidat", "overnight", "when to practice", "night"],
        "flags": ["long_gap"],
        "games": [],
    },
    {
        "cite": "Mednick, Nakayama and Stickgold (2003), Nature Neuroscience",
        "finding": "A daytime nap containing both deep and dream sleep produced as much improvement on a perceptual learning task as a full night of sleep.",
        "apply": "Offer a nap as a legitimate reset when a session fades.",
        "tags": ["nap", "tired", "afternoon", "sleep"],
        "flags": ["late_decline"],
        "games": [],
    },
    {
        "cite": "Erickson and colleagues (2011), PNAS",
        "finding": "In a one-year randomised trial with older adults, aerobic walking increased hippocampal volume and was associated with better spatial memory, while the control group's hippocampus shrank.",
        "apply": "Recommend regular aerobic activity as one of the better-supported ways to support memory, noting the study was in older adults.",
        "tags": ["exercise", "walk", "run", "gym", "fitness", "physical"],
        "flags": [],
        "games": ["spatial"],
    },
    {
        "cite": "Mrazek and colleagues (2013), Psychological Science",
        "finding": "A two-week mindfulness course improved working memory capacity and reading test scores and reduced mind wandering compared with a nutrition course.",
        "apply": "Suggest a few minutes of breath-focused attention practice for someone whose focus drifts mid-session.",
        "tags": ["mindful", "meditat", "focus", "mind wander", "distract", "concentrat", "zone out"],
        "flags": ["uneven_pace"],
        "games": [],
    },
    {
        "cite": "Killingsworth and Gilbert (2010), Science",
        "finding": "In an experience-sampling study, people's minds were wandering in nearly half of the sampled moments, and they reported being less happy when it was.",
        "apply": "Normalise drifting attention as the default state of the mind, and frame the games as short practice in returning to the task.",
        "tags": ["mind wander", "distract", "daydream", "zone out", "focus"],
        "flags": ["uneven_pace"],
        "games": [],
    },
    {
        "cite": "Ophir, Nass and Wagner (2009), PNAS",
        "finding": "Heavy media multitaskers were worse at filtering out irrelevant information and at switching tasks than light multitaskers.",
        "apply": "Suggest single-tasking during sessions and study: one screen, notifications off.",
        "tags": ["multitask", "phone", "tabs", "notifications", "distract", "social media"],
        "flags": ["uneven_pace", "rushed_errors"],
        "games": [],
    },
    {
        "cite": "Ward and colleagues (2017), Journal of the Association for Consumer Research",
        "finding": "Having one's own smartphone within sight reduced available working memory and reasoning performance, even when it was face down and silent.",
        "apply": "Suggest putting the phone in another room for demanding work or a serious session.",
        "tags": ["phone", "distract", "notifications", "focus", "concentrat"],
        "flags": ["uneven_pace"],
        "games": [],
    },
    {
        "cite": "Berman, Jonides and Kaplan (2008), Psychological Science",
        "finding": "A walk in a natural setting improved performance on a directed-attention task (backward digit span) more than a walk through busy streets.",
        "apply": "Recommend a short break outdoors when attention is spent, before returning to a demanding game.",
        "tags": ["break", "nature", "walk", "rest", "tired", "burnt out", "focus"],
        "flags": ["late_decline", "slowing"],
        "games": ["digit"],
    },
    {
        "cite": "Kane and Engle (2000), Journal of Experimental Psychology: Learning, Memory, and Cognition",
        "finding": "Earlier lists interfere with remembering later ones (proactive interference), and people with lower working memory capacity are more vulnerable to it.",
        "apply": "Explain why word recall gets harder across rounds, and suggest a brief reset or a distinct mental image for each new list.",
        "tags": ["word", "interfere", "mix up", "earlier", "confus", "list"],
        "flags": ["late_decline"],
        "games": ["word"],
    },
    {
        "cite": "Craik and Lockhart (1972), Journal of Verbal Learning and Verbal Behavior",
        "finding": "How deeply something is processed matters more for remembering it than how long it is rehearsed; thinking about meaning beats repeating the surface form.",
        "apply": "For word recall and studying, link each item to a meaning, an image or a short story instead of repeating it.",
        "tags": ["word", "study", "remember", "memor", "repeat", "meaning", "learn"],
        "flags": ["capacity_limit"],
        "games": ["word"],
    },
    {
        "cite": "Dresler and colleagues (2017), Neuron",
        "finding": "Ordinary adults trained in the memory-palace method for six weeks more than doubled their word-list recall, and their brain connectivity shifted toward the pattern seen in memory athletes.",
        "apply": "Teach the memory palace for word lists: place each word along a familiar route.",
        "tags": ["memory palace", "loci", "mnemonic", "word", "list", "memory athlete", "technique"],
        "flags": ["plateau", "capacity_limit"],
        "games": ["word"],
    },
    {
        "cite": "Diamond (2013), Annual Review of Psychology",
        "finding": "Executive functions rest on three core abilities: holding and working with information, resisting impulses and distractions, and switching flexibly. They suffer first under stress, poor sleep, loneliness or lack of exercise.",
        "apply": "Map the person's pattern to the relevant ability (holding, inhibiting, switching) and check the basics before blaming skill.",
        "tags": ["executive", "self control", "impuls", "switch", "flexib", "focus", "discipline"],
        "flags": ["rushed_errors", "off_day"],
        "games": ["spatial_reverse", "oddoneout"],
    },
    {
        "cite": "Salthouse (1996), Psychological Review",
        "finding": "Processing speed accounts for a large share of age-related differences in cognition: when early steps are slow, later steps run out of time or lose the earlier results.",
        "apply": "For timed games, treat speed as its own trainable limit, and practise at a pace where accuracy holds before pushing tempo.",
        "tags": ["speed", "slow", "processing", "age", "older", "reaction", "quick"],
        "flags": ["slowing", "overloaded_errors"],
        "games": ["math", "color"],
    },
    {
        "cite": "Lally and colleagues (2010), European Journal of Social Psychology",
        "finding": "Daily behaviours took a median of about 66 days to become automatic, with wide variation between people, and missing a single day did not derail the process.",
        "apply": "Set a realistic horizon for a practice habit and tell the person a missed day does not undo it.",
        "tags": ["habit", "consisten", "routine", "streak", "motivat", "keep going", "daily"],
        "flags": ["long_gap"],
        "games": [],
    },
    {
        "cite": "Gollwitzer (1999), American Psychologist",
        "finding": "Plans in the form \"when situation X arises, I will do Y\" make people considerably more likely to follow through than goals alone.",
        "apply": "Help the person write one if-then plan for practice, tied to an existing cue in their day.",
        "tags": ["plan", "procrastinat", "follow through", "motivat", "habit", "goal", "discipline"],
        "flags": ["long_gap"],
        "games": [],
    },
]

_BY_FLAG = {}
for _entry in EVIDENCE:
    for _flag in _entry["flags"]:
        _BY_FLAG.setdefault(_flag, []).append(_entry)


def _score(entry: dict, text: str, games: set[str], flags: set[str]) -> float:
    score = 0.0
    for tag in entry["tags"]:
        if tag in text:
            score += 2.0 if " " in tag else 1.2
    score += 0.6 * len(games.intersection(entry["games"]))
    score += 1.5 * len(flags.intersection(entry["flags"]))
    return score


def select(text: str = "", games: list[str] | None = None, flags: list[str] | None = None, limit: int = 4) -> list[dict]:
    text = re.sub(r"[^a-z0-9\- ]+", " ", (text or "").lower())
    game_set, flag_set = set(games or []), set(flags or [])
    scored = [(_score(e, text, game_set, flag_set), i, e) for i, e in enumerate(EVIDENCE)]
    scored = [s for s in scored if s[0] >= 1.2]
    scored.sort(key=lambda s: (-s[0], s[1]))
    return [e for _, _, e in scored[:limit]]


def evidence_block(entries: list[dict], depth: str = "moderate") -> str:
    if not entries:
        return ""
    lines = [
        "\n\nRESEARCH YOU CAN APPLY RIGHT NOW (chosen for this message and this person's data):",
    ]
    for e in entries:
        lines.append(f"- {e['cite']}. Finding: {e['finding']} How to use it: {e['apply']}")
    if depth == "simple":
        lines.append(
            "Apply the most relevant finding to this person's actual numbers or situation as plain advice. "
            "Their settings ask for light explanations, so do not name the researchers unless they ask where it comes from."
        )
    else:
        lines.append(
            "When you give advice, build it on the most relevant finding above: say in one plain sentence what the "
            "researchers did or found, name them and the year naturally, then apply it to this person's actual numbers "
            "or situation with one concrete step. Use one finding, two at most."
        )
    if depth != "simple":
        chosen = {e["cite"] for e in entries}
        others = "; ".join(e["cite"].split(",")[0] for e in EVIDENCE if e["cite"] not in chosen)
        lines.append(
            "Other vetted sources you may use instead when one fits the question better, provided you describe it "
            "accurately: " + others + "."
        )
    lines.append(
        "Stay inside what each finding actually showed, including its limits and who was studied. Never invent a "
        "study, a statistic or a citation. If nothing here fits, give practical advice without citing anything."
    )
    return "\n".join(lines)
