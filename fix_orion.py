"""Script to fix orion.py backend issues in-place."""
with open('backend/routers/orion.py', 'r', encoding='utf-8') as f:
    content = f.read()

# ─── FIX 1: Broken template literals in /stream endpoint ─────────────────────
old_stream = (
    'elif panel_type == "fun_fact":\n'
    ' right_panel_prompt = """\n\n'
    'CURRENT FUN FACT CONTEXT:\n'
    '- Hook: {panel_data.get(\'hook\', \'\')}}\n'
    '- Detail: {panel_data.get(\'detail\', \'\')}}\n'
    '- Connection: {panel_data.get(\'connection\', \'\')}}\n\n'
    'Discuss this brain fact with the user and encourage them to apply it.\n'
    '"""\n'
    ' elif panel_type == "curiosity_prompt":\n'
    ' right_panel_prompt = """\n\n'
    'CURRENT CURIOSITY PROMPT CONTEXT:\n'
    '- Question: {panel_data.get(\'question\', \'))}\n'
    '- Explore: {panel_data.get(\'explore\', \'))}\n'
    '- Your take: {panel_data.get(\'your_take\', \'))}\n\n'
    'Encourage the user to think about this. Ask follow-up questions to get their perspective.\n'
    '"""\n\n'
    'system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + cognitive_context + user_memory'
)

new_stream = (
    'elif panel_type == "fun_fact":\n'
    ' right_panel_prompt = f"""\n\n'
    'CURRENT FUN FACT CONTEXT:\n'
    '- Hook: {panel_data.get(\'hook\', \'\')}\n'
    '- Detail: {panel_data.get(\'detail\', \'\')}\n'
    '- Connection: {panel_data.get(\'connection\', \'\')}\n\n'
    'Discuss this brain fact with the user and encourage them to apply it.\n'
    '"""\n'
    ' elif panel_type == "curiosity_prompt":\n'
    ' right_panel_prompt = f"""\n\n'
    'CURRENT CURIOSITY PROMPT CONTEXT:\n'
    '- Question: {panel_data.get(\'question\', \'\')}\n'
    '- Explore: {panel_data.get(\'explore\', \'\')}\n'
    '- Your take: {panel_data.get(\'your_take\', \'\')}\n\n'
    'Encourage the user to think about this. Ask follow-up questions to get their perspective.\n'
    '"""\n\n'
    'selected_option_note = (f"\\n\\nThe user just selected this option: {data.selected_option}\\nAcknowledge their choice and discuss the thinking behind it.") if data.selected_option else ""\n\n'
    'system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + selected_option_note + cognitive_context + user_memory\n\n'
    '# Save user message for conversation persistence\n'
    'from utils.auth import generate_uuid\n'
    'from models.database import OrionConversation, OrionMessage\n'
    'conv_id = None\n'
    'try:\n'
    '    conv = OrionConversation(user_id=current_user.id, title=(data.content[:60] if len(data.content) > 60 else data.content))\n'
    '    db.add(conv); db.commit(); db.refresh(conv); conv_id = conv.id\n'
    '    db.add(OrionMessage(conversation_id=conv_id, user_id=current_user.id, role="user", content=data.content))\n'
    '    db.commit()\n'
    'except Exception as e:\n'
    '    print(f"[Orion conv error] {type(e).__name__}: {e}")\n\n'
)

if old_stream in content:
    content = content.replace(old_stream, new_stream, 1)
    print("FIXED: stream endpoint broken template literals + chat history saving")
else:
    print("NOT FOUND: stream endpoint section")

# ─── FIX 2: Broken template literals in /message endpoint ────────────────────
old_message = (
    'elif panel_type == "fun_fact":\n'
    ' right_panel_prompt = """\n\n'
    'CURRENT FUN FACT CONTEXT:\n'
    '- Hook: {panel_data.get(\'hook\', \')\n'
    '- Detail: {panel_data.get(\'detail\', \')\n'
    '- Connection: {panel_data.get(\'connection\', \')\n\n'
    'Discuss this brain fact with the user and encourage them to apply it.\n'
    '"""\n'
    ' elif panel_type == "curiosity_prompt":\n'
    ' right_panel_prompt = """\n\n'
    'CURRENT CURIOSITY PROMPT CONTEXT:\n'
    '- Question: {panel_data.get(\'question\', \')\n'
    '- Explore: {panel_data.get(\'explore\', \')\n'
    '- Your take: {panel_data.get(\'your_take\', \')\n\n'
    'Encourage the user to think about this. Ask follow-up questions to get their perspective.\n'
    '"""\n\n'
    'system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + cognitive_context + user_memory\n\n'
    'messages = [{"role": "system", "content": system_prompt}]\n'
    'for msg in data.history[-12:]:\n'
    '    messages.append({"role": msg["role"], "content": msg["content"]})\n'
    'messages.append({"role": "user", "content": data.content})\n\n'
    'try:\n'
    '    response = _call_groq(messages)\n'
    '    return {"response": response.choices[0].message.content}'
)

new_message = (
    'elif panel_type == "fun_fact":\n'
    ' right_panel_prompt = f"""\n\n'
    'CURRENT FUN FACT CONTEXT:\n'
    '- Hook: {panel_data.get(\'hook\', \'\')}\n'
    '- Detail: {panel_data.get(\'detail\', \'\')}\n'
    '- Connection: {panel_data.get(\'connection\', \'\')}\n\n'
    'Discuss this brain fact with the user and encourage them to apply it.\n'
    '"""\n'
    ' elif panel_type == "curiosity_prompt":\n'
    ' right_panel_prompt = f"""\n\n'
    'CURRENT CURIOSITY PROMPT CONTEXT:\n'
    '- Question: {panel_data.get(\'question\', \'\')}\n'
    '- Explore: {panel_data.get(\'explore\', \'\')}\n'
    '- Your take: {panel_data.get(\'your_take\', \'\')}\n\n'
    'Encourage the user to think about this. Ask follow-up questions to get their perspective.\n'
    '"""\n\n'
    'selected_option_note = (f"\\n\\nThe user just selected this option: {data.selected_option}\\nAcknowledge their choice and discuss the thinking behind it.") if data.selected_option else ""\n\n'
    'system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + selected_option_note + cognitive_context + user_memory\n\n'
    'messages = [{"role": "system", "content": system_prompt}]\n'
    'for msg in data.history[-12:]:\n'
    '    messages.append({"role": msg["role"], "content": msg["content"]})\n'
    'messages.append({"role": "user", "content": data.content})\n\n'
    'try:\n'
    '    response = _call_groq(messages)\n'
    '    return {"response": response.choices[0].message.content}'
)

# The /message endpoint broken part is slightly different - let me find it exactly
# Check for the specific broken patterns
msg_check = content.find("Hook: {panel_data.get('hook', ')}")
if msg_check > 0:
    print("FOUND: message endpoint broken fun_fact section")
    # Use targeted approach - replace the broken section
    import re
    # Find and replace broken fun_fact template
    broken_fun = re.compile(
        r'elif panel_type == "fun_fact":\n( right_panel_prompt = )"""\n\nCURRENT FUN FACT CONTEXT:\n- Hook: \{panel_data\.get\(\'hook\', \'\)}}',
        re.MULTILINE
    )
    content = broken_fun.sub(
        'elif panel_type == "fun_fact":\n right_panel_prompt = f"""\\n\\nCURRENT FUN FACT CONTEXT:\\n- Hook: {panel_data.get(\'hook\', \'\')}',
        content
    )
    # Fix the closing braces issue - each line has an extra }} or )))
    content = content.replace(
        ")- Hook: {panel_data.get('hook', '')}}",
        ")- Hook: {panel_data.get('hook', '')}"
    )
    content = content.replace(
        ")- Detail: {panel_data.get('detail', '')}}",
        ")- Detail: {panel_data.get('detail', '')}"
    )
    content = content.replace(
        ")- Connection: {panel_data.get('connection', ''")}}",
        ")- Connection: {panel_data.get('connection', '')}"
    )
    content = content.replace(
        ")- Question: {panel_data.get('question', ''))}",
        ")- Question: {panel_data.get('question', '')}"
    )
    content = content.replace(
        ")- Explore: {panel_data.get('explore', ''))}",
        ")- Explore: {panel_data.get('explore', '')}"
    )
    content = content.replace(
        ")- Your take: {panel_data.get('your_take', ''))}",
        ")- Your take: {panel_data.get('your_take', '')}"
    )
    print("FIXED: message endpoint template literals")
else:
    print("NOT FOUND: message endpoint broken section")

# ─── FIX 3: Scenario options parsing in /right-panel-content ─────────────────
# Find the old parsing code and replace with the robust _parse_scenario_options
old_parsing = '            result["options"] = [o.strip() for o in options_text.split("\\n") if o.strip()]'
if old_parsing in content:
    content = content.replace(
        'result["options"] = [o.strip() for o in options_text.split("\\n") if o.strip()]',
        'result["options"] = _parse_scenario_options(raw, options_match + 8, think_match)'
    )
    print("FIXED: scenario options parsing using _parse_scenario_options")
else:
    print("NOT FOUND: scenario options parsing code (may already be fixed)")

# Check if the streaming generate() function saves the assistant response
# We need to save after streaming is done - add after the while loop in generate()
generate_save_check = content.find('_save_assistant_response(accumulated)')
if generate_save_check < 0:
    # Need to add saving of assistant message after streaming completes
    # Find the line that yields [DONE]
    done_yield = content.find('yield "data: [DONE]\\n\\n"', content.find('async def generate():'))
    if done_yield > 0:
        # Find the closing of generate() function and add save before it
        # After the while loop ends, before return StreamingResponse
        print("FOUND: generator location - will add assistant response saving")

with open('backend/routers/orion.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Script complete!")