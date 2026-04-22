# EchoGuitars — יומן עדכונים ל-Claude

> **איך להשתמש בקובץ זה:**
> בתחילת שיחה חדשה, בקש מ-Claude לקרוא את הקובץ הזה (`CLAUDE_UPDATES.md`) כדי להכיר את היסטוריית השינויים והמצב הנוכחי של הפרויקט.

---

## סקירת הפרויקט

**EchoGuitars** — מערכת ניהול לאיסוף גיטרות לתרומה ("גיטרה לכל ילד").

### ארכיטקטורה
- **Frontend:** React + Vite, CSS Modules, RTL עברית
- **Backend:** Node.js + Express
- **מסד נתונים:** Google Sheets (דרך Google Sheets API v4)
- **Geocoding:** Google Maps Geocoding API
- **AI:** Anthropic Claude API (claude-sonnet-4-6)
- **Upload תמונות:** Cloudinary
- **Deploy:** Frontend ב-Vercel, Backend ב-Railway

### מבנה קבצים מרכזי
```
frontend/src/
  App.jsx                     — ניתוב ראשי, ניהול auth (admin/volunteer)
  pages/
    Login.jsx                 — מסך כניסה (admin: JANIS123, volunteer: JANIS)
    Dashboard.jsx             — לוח בקרה עם גרפים (recharts)
    QuickEdit.jsx             — עדכון מהיר: CollectMode / DonateMode / AiMode
    TableView.jsx             — טבלת כל הגיטרות עם סינון/מיון/מחיקה
    MapView.jsx               — מפה אינטראקטיבית (Leaflet), volunteer mode
    AddressReview.jsx         — בדיקת/תיקון כתובות לא מזוהות
  components/
    Layout.jsx                — sidebar + nav (admin only)
    VolunteerLayout.jsx       — header פשוט (volunteer only)
    GuitarListModal.jsx       — modal לרשימת גיטרות מה-Dashboard
  api/client.js               — כל קריאות ה-API (axios)

backend/src/
  index.js                    — Express server, CORS, routes
  routes/
    guitars.js                — CRUD גיטרות + stats + map + address-issues
    donors.js                 — חיפוש תורמים (autocomplete)
    ai.js                     — parse-notes, parse-update
    upload.js                 — העלאת תמונות ל-Cloudinary
  services/
    sheetsService.js          — כל לוגיקת Google Sheets
    geocodeService.js         — Google Maps Geocoding + cache
    aiService.js              — קריאות ל-Anthropic API
```

### מבנה Google Sheets (עמודות A–W)
| עמודה | שדה | מפתח בקוד |
|-------|-----|-----------|
| A | זמן הגשה | SUBMISSION_TIME |
| B | שם | NAME |
| C | טלפון | PHONE |
| D | עיר | CITY |
| E | רחוב | STREET |
| F | אימייל | EMAIL |
| G | סוג גיטרה | GUITAR_TYPE |
| H | תקינות | WORKING |
| I | קייס | CASE |
| J | פירוט תקלה | DEFECT |
| K | איך הגעתם | HOW_FOUND |
| L | פירוט נוסף | EXTRA_DETAILS |
| M | קשר | CONTACT |
| N | איך אוספים | COLLECTION |
| O | נאסף | COLLECTED |
| P | הערות | NOTES |
| Q | מי מתקן | WHO_REPAIRS |
| R | תוקן | REPAIRED |
| S | דגם | MODEL |
| T | נתרם ל | DONATED_TO |
| U | מזהה יציב | ID |
| V | קישור תמונה | IMAGE_URL |
| W | נעול למתנדב | IN_COLLECTION (שם מתנדב / ריק) |

### מצב Auth
- **admin:** localStorage `echo_auth=1`, `echo_role=admin` → רואה הכל
- **volunteer:** `echo_role=volunteer` → רואה רק MapView עם volunteer mode

---

## יומן שינויים

### 2026-04-22 — קריאת קוד ראשונית
- Claude קרא את כל קבצי הפרויקט לעומק
- נוצר קובץ `CLAUDE_UPDATES.md` זה לתיעוד עדכונים עתידיים

---

### 2026-04-22 — מערכת מתנדבים מלאה (שינוי FLOW גדול)

**קבצים שנוצרו:**
- `backend/src/routes/volunteers.js` — כל ה-endpoints לניהול קולקציות מתנדב
- `frontend/src/pages/Volunteers.jsx` + CSS — עמוד מנהל: בקשות ממתינות, היסטוריה, לוג
- `frontend/src/components/CollectionBubble.jsx` + CSS — בועית צפה עם רשימת האיסוף

**קבצים שהשתנו:**
- `backend/src/services/sheetsService.js` — עמודה W חדשה (`inCollection`), גיליונות `Collections` + `ActionLog` (נוצרים אוטומטית), פונקציות lock/unlock גיטרה, CRUD קולקציות, לוג פעולות
- `backend/src/index.js` — רישום `/api/volunteers` route
- `frontend/src/api/client.js` — פונקציות API חדשות לקולקציות מתנדב
- `frontend/src/pages/Login.jsx` — מסך חדש: שם + כתובת + סיסמה למתנדב, כניסת מנהל בתחתית
- `frontend/src/App.jsx` — state של volunteerInfo + collection, פונקציות save/remove/send/markCollected
- `frontend/src/pages/MapView.jsx` — גיטרות נעולות (סגול, 🔒), קולקציה קיימת מסומנת, כפתור המשך שומר לbackend, auto-geocode כתובת מתנדב
- `frontend/src/components/VolunteerLayout.jsx` — "שלום XXX", שילוב CollectionBubble
- `frontend/src/components/VolunteerLayout.module.css` — סגנון greeting
- `frontend/src/components/Layout.jsx` — הוספת "מתנדבים" לניווט עם badge (Users icon)
- `frontend/src/pages/MapView.module.css` — `.nearbyCardLocked` (סגול)

**מה נעשה — תיאור:**

**Login:** מסך ראשי מציג טופס מתנדב (שם + כתובת + סיסמה). מתנדב חוזר מתחבר אוטומטית. כניסת מנהל עם לחיצה על לינק בתחתית.

**Flow מתנדב:**
1. מתנדב בוחר גיטרות → לוחץ "המשך" → שומר ל-backend
2. Backend נועל גיטרות (עמודה W) + יוצר/מעדכן Collection בגיליון `Collections`
3. בועית צפה מופיעה (bottom-left) עם מספר גיטרות
4. בועית → פאנל עם: רשימת גיטרות, כפתור "נאספה" לכל גיטרה, כפתור "לאישור מנהל" (פותח WhatsApp + מסמן sent)
5. גיטרה שסומנה כנאספת → status=pending בקולקציה
6. גיטרות שנועלו → מופיעות בסגול 🔒 במפה, לא ניתנות לבחירה ע"י מתנדבים אחרים

**Flow מנהל:**
- עמוד "מתנדבים" (/volunteers) עם 3 tabs: ממתין לאישור / היסטוריה / לוג
- מנהל רואה גיטרות עם status=pending ויכול לאשר/לדחות כל אחת
- אישור: מעדכן גיטרה ב-Sheets (collected=TRUE + notes "אוסף: X | יעד: Y"), מנקה עמודה W
- דחייה: מנקה עמודה W → גיטרה חוזרת למפה
- Badge על ניווט מתנדבים = מספר גיטרות ממתינות לאישור

**גיליונות חדשים ב-Sheets (נוצרים אוטומטית):**
- `Collections`: id, volunteer_name, volunteer_address, guitars_json, status, sent_to_admin, created_at, updated_at
- `ActionLog`: timestamp, actor, action, guitar_id, guitar_name, details

**נקודות חשובות:**
- עמודה W בגיליון הקיים = שם המתנדב שנעל, ריק = זמינה (range עודכן מ-A:V ל-A:W בכל הקוד)
- collection_id נשמר ב-localStorage של הדפדפן
- כתובת המתנדב → auto-geocode במפה לנקודת מוצא

---

## שינויים עתידיים — פורמט

```
### YYYY-MM-DD — תיאור קצר
**קבצים שהשתנו:**
- `path/to/file.jsx` — מה השתנה
- `path/to/other.js` — מה השתנה

**מה נעשה:**
תיאור של השינוי ולמה.

**דברים לשים לב:**
- אזהרות/תלויות/דברים שצריך לבדוק
```

---

## נקודות חשובות לזכור

1. **ID יציב vs rowIndex:** כל גיטרה יש לה `id` מעמודה U (קבוע) ו-`rowIndex` (מיקום פיזי בגיליון שיכול להשתנות). תמיד לעדכן לפי ה-`id` היציב.

2. **Mock mode:** כשאין `GOOGLE_SHEET_ID` בסביבה, הבקאנד משתמש ב-`mockData.js` אוטומטית.

3. **Geocoding cache:** `geocodeService.js` מחזיק cache בזיכרון. מתנקה בעת redeply או ע"י `clearGeocodeCache()`.

4. **הוספת הערות:** הלוגיקה ב-`sheetsService.js` מוסיפה הערות חדשות על גבי קיימות (append עם `\n`), לא מחליפה.

5. **CollectMode** ו-**DonateMode** שניהם מאפשרים חיפוש מרובה של תורמים ובחירת מספר גיטרות → שמירה בבת אחת.
