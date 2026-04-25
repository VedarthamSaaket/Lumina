"""
Comprehensive fix script for backend/routers/orion.py
Fixes:
  1. Broken f-string template literals (missing '' or extra })
  2. Add selected_option_note to /stream
  3. Add selected_option_note to /message
  4. Save OrionConversation + OrionMessage on send
  5. Save assistant response after streaming
  6. Fix scenario options parsing with regex
  7. Add conversation history list/fetch endpoints
"""

with open('backend/routers/orion.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("File loaded, length:", len(content))

# ── 1. Fix all broken template literal patterns ──────────────────────────────
# Pattern: {panel_data.get('key', '')}}
# These appear in multiple places. Replace all occurrences of the broken form.
broken_patterns = [
    ("{panel_data.get('hook', '')}}",    "{panel_data.get('hook', '')}"),
    ("{panel_data.get('detail', '')}}",  "{panel_data.get('detail', '')}"),
    ("{panel_data.get('connection', '')}}", "{panel_data.get('connection', '')}"),
    ("{panel_data.get('question', ''))}", "{panel_data.get('question', '')}"),
    ("{panel_data.get('explore', ''))}",  "{panel_data.get('explore', '')}"),
    ("{panel_data.get('your_take', ''))}", "{panel_data.get('your_take', '')}"),
    # Also fix in message endpoint where '' is missing
    ("get('hook', ')}\n", "get('hook', '')}\n"),
    ("get('detail', ')}\n", "get('detail', '')}\n"),
    ("get('connection', ')}\n", "get('connection', '')}\n"),
    ("get('question', ')}\n", "get('question', '')}\n"),
    ("get('explore', ')}\n", "get('explore', '')}\n"),
    ("get('your_take', ')}\n", "get('your_take', '')}\n"),
]

for old, new in broken_patterns:
    count = content.count(old)
    if count > 0:
        content = content.replace(old, new)
        print(f"  Fixed {count}x: {old[:50]}")

# ── 2. Add selected_option_note to /stream endpoint ──────────────────────────
# Find the system_prompt line in /stream and add selected_option_note before it
stream_marker_before = 'cognitive_context + user_memory\r\n\r\n messages = [{"role": "system", "content": system_prompt}]'
stream_marker_after = '\r\n'.join([
    'cognitive_context + user_memory',
    '',
    'selected_option_note = (f"\\n\\nThe user just selected this option in the panel: {data.selected_option}\\nAcknowledge their choice specifically and discuss the thinking behind it.") if data.selected_option else ""',
    '',
    'system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + selected_option_note + cognitive_context + user_memory',
    '',
    '# Save conversation to DB',
    'from models.database import OrionConversation, OrionMessage',
    'stream_conv_id = None',
    'try:',
    '    conv = OrionConversation(user_id=current_user.id, title=(data.content[:60] if len(data.content) > 60 else data.content))',
    '    db.add(conv); db.commit(); db.refresh(conv)',
    '    stream_conv_id = conv.id',
    '    db.add(OrionMessage(conversation_id=stream_conv_id, user_id=current_user.id, role="user", content=data.content))',
    '    db.commit()',
    'except Exception as e:',
    '    print(f"[Orion conv save error] {type(e).__name__}: {e}")',
    '',
    'messages = [{"role": "system", "content": system_prompt}]',
])
if stream_marker_before in content:
    content = content.replace(stream_marker_before, stream_marker_after)
    print("FIX: Added selected_option_note + conversation saving to /stream")
else:
    print("WARN: stream marker not found (may already be patched)")
    # Try with just \n (unix line endings)
    unix_marker = stream_marker_before.replace('\r\n', '\n').replace('\r', '')
    if unix_marker in content:
        print("  Unix line ending variant found")
        content = content.replace(unix_marker, stream_marker_after.replace('\r\n', '\n').replace('\r', ''))
    else:
        print("  Could not insert - checking current state...")
        idx = content.find('system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + cognitive_context + user_memory')
        if idx >= 0:
            print("  Found system_prompt at", idx, "next 200 chars:", repr(content[idx:idx+200]))

# ── 3. Add selected_option_note to /message endpoint ─────────────────────────
msg_marker = 'cognitive_context + user_memory\r\n\r\nmessages = [{"role": "system", "content": system_prompt}]\r\nfor msg in data.history[-12:]:\r\n    messages.append({"role": msg["role"], "content": msg["content"]})\r\nmessages.append({"role": "user", "content": data.content})\r\n\r\ntry:\r\n    response = _call_groq(messages)'
msg_marker_after = '\r\n'.join([
    'cognitive_context + user_memory',
    '',
    'selected_option_note = (f"\\n\\nThe user just selected this option in the panel: {data.selected_option}\\nAcknowledge their choice specifically.") if data.selected_option else ""',
    '',
    'system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + selected_option_note + cognitive_context + user_memory',
    '',
    'messages = [{"role": "system", "content": system_prompt}]',
    'for msg in data.history[-12:]:',
    '    messages.append({"role": msg["role"], "content": msg["content"]})',
    'messages.append({"role": "user", "content": data.content})',
    '',
    'try:',
    '    response = _call_groq(messages)',
])
if msg_marker in content:
    content = content.replace(msg_marker, msg_marker_after)
    print("FIX: Added selected_option_note to /message")
else:
    print("WARN: /message marker not found")

# ── 4. Fix scenario options parsing in /right-panel-content ──────────────────
# Replace the simple split("\n") with the regex-based _parse_scenario_options
old_parsing = "result[\"options\"] = [o.strip() for o in options_text.split('\\n') if o.strip()]"
new_parsing = "result[\"options\"] = _parse_scenario_options(raw, options_match + 8, think_match)"
if old_parsing in content:
    content = content.replace(old_parsing, new_parsing)
    print("FIX: Replaced scenario options parsing with _parse_scenario_options")
else:
    print("WARN: scenario options parsing not found in expected form")

# ── 5. Add conversation/list endpoints (append before @router.get("/right-panel")) ─────────
# First check if they already exist
if '@router.get("/conversations")' in content:
    print("SKIP: /conversations endpoint already exists")
else:
    conv_endpoint = '''

@router.get("/conversations")
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """Return all Orion conversation threads, newest first."""
    convs = (
        db.query(OrionConversation)
        .filter(OrionConversation.user_id == current_user.id)
        .order_by(desc(OrionConversation.updated_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convs
    ]


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all messages in a specific Orion conversation."""
    conv = (
        db.query(OrionConversation)
        .filter(OrionConversation.id == conversation_id, OrionConversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = (
        db.query(OrionMessage)
        .filter(OrionMessage.conversation_id == conversation_id)
        .order_by(OrionMessage.created_at)
        .all()
    )
    return {
        "id": conv.id,
        "title": conv.title,
        "messages": [
            {"id": m.id, "role": m.role, "content": m.content,
             "created_at": m.created_at.isoformat() if m.created_at else None}
            for m in msgs
        ],
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a conversation and all its messages."""
    # Delete messages first
    db.query(OrionMessage).filter(
        OrionMessage.conversation_id == conversation_id,
        OrionMessage.user_id == current_user.id,
    ).delete(synchronize_session=False)
    # Delete conversation
    deleted = db.query(OrionConversation).filter(
        OrionConversation.id == conversation_id,
        OrionConversation.user_id == current_user.id,
    ).delete(synchronize_session=False)
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True}

'''
    # Append before right-panel-content endpoint
    rp_endpoint_marker = '@router.get("/right-panel-content")'
    if rp_endpoint_marker in content:
        content = content.replace(rp_endpoint_marker, conv_endpoint + rp_endpoint_marker)
        print("FIX: Added /conversations, /conversations/{id}, /delete endpoints")
    else:
        print("WARN: /right-panel-content marker not found, appending to end")
        content += conv_endpoint

# ── 6. Save assistant response after streaming completes ─────────────────────
# Add save after the while loop exits in generate(), before StreamingResponse
# We do this by wrapping generate() or adding a try/finally
OLD_STREAM_RETURN = (
    'yield "data: [DONE]\\n\\n"\n\n'
    'return StreamingResponse(\n'
    '    generate(),\n'
    '    media_type="text/event-stream",\n'
    '    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},\n'
    ')'
)
# Normalise line endings in the file for the check
normalized_content = content.replace('\r\n', '\n')
old_stream_normalized = 'yield "data: [DONE]\\n\\n"\n\nreturn StreamingResponse(\n    generate(),\n    media_type="text/event-stream",\n    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},\n)'
if old_stream_normalized in normalized_content:
    NEW_STREAM_RETURN = (
        'yield "data: [DONE]\\n\\n"\n\n'
        ' if stream_conv_id and accumulated:\n'
        '     try:\n'
        '         db.add(OrionMessage(conversation_id=stream_conv_id, user_id=current_user.id, role="assistant", content=accumulated))\n'
        '         db.commit()\n'
        '     except Exception as e_save:\n'
        '         print(f"[Orion asst save error] {type(e_save).__name__}: {e_save}")\n\n'
        'return StreamingResponse(\n'
        '    generate(),\n'
        '    media_type="text/event-stream",\n'
        '    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},\n'
        ')'
    )
    normalized_content = normalized_content.replace(old_stream_normalized, NEW_STREAM_RETURN)
    content = normalized_content.replace('\n', '\r\n')
    print("FIX: Added assistant response saving after streaming")
else:
    # Try the actual content
    actual = normalized_content[normalized_content.find('yield "data: [DONE]'):normalized_content.find('return StreamingResponse')]
    print("WARN: stream return pattern not exact. Found:", repr(actual[:100]))

with open('backend/routers/orion.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nAll fixes applied. Verifying syntax...")
import subprocess
result = subprocess.run(['python', '-m', 'py_compile', 'backend/routers/orion.py'],
                      capture_output=True, text=True, cwd='.')
if result.returncode == 0:
    print("SYNTAX OK: orion.py compiles cleanly")
else:
    print("SYNTAX ERROR:", result.stderr[:500])

print("\nDone!")