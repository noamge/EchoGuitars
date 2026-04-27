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

function computeStats(guitars) {
  const total = guitars.length;
  const collected = guitars.filter(g => g.collected).length;
  const notCollected = total - collected;

  const byType = { אקוסטית: 0, קלאסית: 0, חשמלית: 0, אחר: 0 };
  const notCollectedByType = { אקוסטית: 0, קלאסית: 0, חשמלית: 0, אחר: 0 };
  const regions = {};
  let repaired = 0, inRepair = 0;

  for (const g of guitars) {
    const tk = ['אקוסטית', 'קלאסית', 'חשמלית'].includes(g.guitarType) ? g.guitarType : 'אחר';
    byType[tk]++;
    if (!g.collected) notCollectedByType[tk]++;
    const region = g.region || 'אחר';
    regions[region] = (regions[region] || 0) + 1;
    if (g.repaired) repaired++;
    else if (g.whoRepairs) inRepair++;
  }

  const regionStats = Object.entries(regions)
    .sort(([, a], [, b]) => b - a)
    .map(([r, c]) => `${r}: ${c}`)
    .join(' | ');

  return { total, collected, notCollected, byType, notCollectedByType, repaired, inRepair, regionStats };
}

async function smartQuery(text, guitars) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');

  const s = computeStats(guitars);

  const guitarLines = guitars
    .map(g => `${g.id} | ${g.name} | ${g.city} | ${g.guitarType || '?'} | ${g.collected ? 'נאסף' : 'ממתין'} | ${g.repaired ? 'תוקן' : g.whoRepairs ? `בתיקון אצל ${g.whoRepairs}` : ''}`)
    .join('\n');

  const prompt = `אתה עוזר חכם של מיזם "EchoGuitars" — מיזם תרומת גיטרות לילדים בישראל.

=== סטטיסטיקות בסיס הנתונים ===
סה"כ גיטרות: ${s.total}
נאספו: ${s.collected} | טרם נאספו: ${s.notCollected}
לפי סוג — אקוסטית: ${s.byType.אקוסטית} | קלאסית: ${s.byType.קלאסית} | חשמלית: ${s.byType.חשמלית} | אחר: ${s.byType.אחר}
טרם נאספו לפי סוג — אקוסטית: ${s.notCollectedByType.אקוסטית} | קלאסית: ${s.notCollectedByType.קלאסית} | חשמלית: ${s.notCollectedByType.חשמלית}
תוקנו: ${s.repaired} | בתיקון כרגע: ${s.inRepair}
לפי אזור: ${s.regionStats}

=== רשימת כל הגיטרות (לשיוך שמות) ===
מזהה | שם | עיר | סוג | סטטוס | תיקון
${guitarLines}

=== קלט המשתמש ===
"${text}"

=== הוראות ===
קבע אם זו שאלה על הנתונים או פקודת עדכון.

אם זו שאלה (שואל על סטטיסטיקות, כמויות, פרטים ספציפיים):
→ ענה בעברית תמציתית. החזר: { "type": "answer", "answer": "<תשובה בעברית>" }

אם זו פקודת עדכון (נאסף, תוקן, נתרם, הערה):
→ החזר: { "type": "actions", "actions": [{ "guitarId": <מזהה|null>, "guitarName": "<שם>", "action": "collected|repaired|in_repair|donated|notes", "donatedTo": <null|שם>, "whoRepairs": <null|שם>, "notes": <null|טקסט>, "confidence": "high|low", "question": <null|שאלה בעברית> }] }

השב אך ורק ב-JSON תקין, ללא הסברים.`;

  const response = await axios.post(
    ANTHROPIC_API_URL,
    { model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] },
    { headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } }
  );

  const rawText = response.data.content[0].text.trim();
  const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(jsonText);
}

module.exports = { parseGuitarNotes, parseGeneralUpdate, smartQuery };
