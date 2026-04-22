const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Parse free-text volunteer notes and suggest guitar condition and type.
 * Returns { condition, guitarType, summary }
 */
async function parseGuitarNotes(notes) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const prompt = `You are an assistant helping classify donated guitars for a charity initiative called "Eco Guitar for Every Child".

A volunteer wrote the following notes about a guitar collection:
"${notes}"

Based on these notes, provide a JSON response with:
- "guitarType": one of ["Acoustic", "Classic", "Electric", "Unknown"]
- "condition": one of ["Excellent", "Good", "Fair", "Poor", "Unknown"]
- "summary": a short 1-2 sentence Hebrew summary of the guitar's state suitable for an admin

Respond ONLY with valid JSON. No explanation, no markdown, just JSON.

Example:
{"guitarType": "Acoustic", "condition": "Good", "summary": "גיטרה אקוסטית במצב טוב, עם שריטות קלות על הגוף."}`;

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    }
  );

  const text = response.data.content[0].text.trim();

  // Strip markdown code blocks if present
  const jsonText = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

  const parsed = JSON.parse(jsonText);
  return {
    guitarType: parsed.guitarType || 'Unknown',
    condition: parsed.condition || 'Unknown',
    summary: parsed.summary || '',
  };
}

/**
 * Parse a free-text Hebrew volunteer update and identify which guitars were mentioned and what should be done.
 * Returns { actions: [ { guitarId, guitarName, action, donatedTo, notes } ] }
 */
async function parseGeneralUpdate(text, guitarSummaries) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const dbLines = guitarSummaries
    .map(g => `${g.id} | ${g.name} | ${g.city}`)
    .join('\n');

  const prompt = `You are helping manage a guitar donation database for "Eco Guitar for Every Child" in Israel.

Here is the current guitar database (ID | Donor Name | City):
${dbLines}

A volunteer wrote this update in Hebrew:
"${text}"

Parse this update and identify every guitar mentioned and what should be done.
Possible actions:
- "collected"  — guitar was collected (נאסף)
- "repaired"   — guitar was fully repaired / fixed (תוקן/סיים תיקון)
- "in_repair"  — guitar is currently being repaired / sent for repair, but not done yet (בתיקון/נשלח לתיקון)
- "donated"    — guitar was donated to an organization (נתרם)
- "notes"      — general note only

For "repaired" and "in_repair" actions, also extract:
- "whoRepairs": the name of the person or workshop doing the repair (מי מתקן), or null if not mentioned

Return ONLY valid JSON:
{
  "actions": [
    {
      "guitarId": <matched ID number, or null if unsure>,
      "guitarName": "<matched donor name, or what was mentioned>",
      "action": "collected|repaired|in_repair|donated|notes",
      "donatedTo": "<org name if donated, else null>",
      "whoRepairs": "<repairer name if repair action, else null>",
      "notes": "<note text if action is notes, else null>",
      "confidence": "high|low",
      "question": "<clarifying question in Hebrew if confidence is low, else null>"
    }
  ]
}

Match guitars by donor name (partial/fuzzy ok) or by #ID reference.
Set confidence to "low" and add a clarifying question in Hebrew if:
- The guitar name matches multiple donors
- The match is not clear
- The action is ambiguous
Set confidence to "high" only when you are certain of both the guitar and the action.
If a guitar cannot be identified at all, include it with guitarId: null and confidence: "low".`;

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    }
  );

  const rawText = response.data.content[0].text.trim();
  const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(jsonText);
  return { actions: parsed.actions || [] };
}

module.exports = { parseGuitarNotes, parseGeneralUpdate };
