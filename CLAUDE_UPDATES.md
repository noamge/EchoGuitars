# EchoGuitars — יומן עדכונים ל-Claude

> **איך להשתמש בקובץ זה:**
> בתחילת שיחה חדשה, בקש מ-Claude לקרוא את הקובץ הזה (`CLAUDE_UPDATES.md`) כדי להכיר את היסטוריית השינויים והמצב הנוכחי של הפרויקט.

---

## הנחיות עבודה קבועות (איך לעבוד איתי)

1. **כשמבקשים אישור (כן/לא) — להסביר במילים פשוטות** מה בקשת האישור אומרת בפועל ומה הסיכון אם זה ילך רע, לפני שמחכים לתשובה. לא מספיק לשאול "לבצע X?" — צריך גם למה זה מצריך אישור.
2. **מעט אישורי הרשאה ככל האפשר.** עריכת/כתיבת קבצי מקור בריפו (`frontend/src`, `backend/src`, `backend/scripts`) מאושרת מראש תמיד — כל שינוי שם הולך ל-git ולכן הפיך. `git add/commit/push` ו-`npm run`/`node` גם מאושרים מראש. עדיין עוצרים ומסבירים לפני: פעולות הרסניות בגיט (force-push, reset --hard, מחיקת branch), והרצת בדיקה חיה שתיגע בנתוני production אמיתיים (שורת גיטרה/מתנדב אמיתית, מייל אמיתי) רק כדי לבדוק קוד.
3. **רשת ביטחון לנתונים:** ל-Google Sheets יש היסטוריית גרסאות מובנית (Ctrl+Alt+Shift+H בדפדפן) שמכסה שחזור מלא לכל נקודת זמן. בנוסף יש `backend/scripts/backupSheet.js` — מייצא את כל הטאבים לקובץ JSON מקומי (`backend/backups/`, לא ב-git) — טוב להרצה ידנית לפני שינוי מסוכן/מסיבי.
4. **לתעד כל שינוי משמעותי כאן, בשוטף.** אחרי כל תכונה/תיקון (לא רק כשמבקשים במפורש) — להוסיף רשומה ל"יומן שינויים" למטה, לפי הפורמט שמוגדר בסוף הקובץ, כולל קבצים שהשתנו ולמה.

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
- **Deploy:** Backend ב-**Render**, Frontend — לבדוק
- **Email:** Resend (RESEND_API_KEY ב-Render env vars)

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

---

### 2026-04-23 עד 2026-05-12 — תכונות ותיקונים מרובים

**קבצים שהשתנו (עיקריים):**
- `backend/src/services/sheetsService.js` — ID strategy, city matching, applyRowFormatting, repairGuitarIds
- `backend/src/routes/volunteers.js` — admin-mark-collected, email notifications, logAction בטוח
- `backend/src/routes/guitars.js` — repair-ids endpoint
- `backend/src/services/emailService.js` — תיקון כתובת admin (noamge@gmail.com), תמיכה ב-action collected
- `backend/src/services/aiService.js` — smartQuery (תשובות + פעולות), computeStats
- `frontend/src/pages/MapView.jsx` — כפתור Waze, GPS fallback, toast hints, volunteer crash fix
- `frontend/src/pages/Volunteers.jsx` — tabs בשורה אחת, admin-collected status, badge
- `frontend/src/pages/QuickEdit.jsx` — AI chat mode עם היסטוריה
- `frontend/src/components/Layout.jsx` — badge מתרענן בניווט

**מה נעשה:**

**מערכת מתנדבים:**
- טאב "ממתין לאישור" / "אקטיביות" / "היסטוריה" / "לוג" — כולם גלויים בשורה אחת
- מנהל יכול לסמן גיטרה כ-"נאספה כבר" (admin_collected) — מעדכן גיטרה בגיליון הראשי ישירות
- status חדש: `admin_collected` — שונה מ-`approved` (שזה לאחר אישור תהליך המתנדב)

**מיילים (Resend):**
- נשלח מייל בכל: שמירת רשימה, הסרת גיטרה, סימון "נאספתי"
- FROM: `EchoGuitars <onboarding@resend.dev>` | TO: `noamge@gmail.com`
- **חשוב:** Resend רגיש לרישיות — `noamge` ולא `Noamge`

**Waze:**
- כפתור Waze בכרטיסיות גיטרה (מפה + רשימה)
- toast אזהרה 2 שניות לפני הפניה (חלון רגיל כי מובייל חוסם popup)
- hint "לחץ לבחירה" רק בלחיצה ראשונה, 8 שניות

**AI ב-QuickEdit:**
- chat interface עם היסטוריה
- `smartQuery(text, guitars)` — מחזיר `{type:"answer", answer}` או `{type:"actions", actions}`

**תיקוני באגים:**
- crash מתנדב "משהו השתבש": `useRef` חסר ב-MapView
- toast מופיע בטעינה: state מאותחל ל-`null` ולא `false`
- מייל 403: Resend רגיש לרישיות בכתובת TO
- city matching: `"הליבנה".includes("יבנה")` → תוקן ל-word-boundary regex
- אורנית נוספה לרשימת הערים הידועות
- badge כתובות לא מתנקה: Layout re-fetch בכל שינוי route + סינון skipped
- guitar תקוע ב-collection: handleRemoveFromCollection ממתין לAPI ומרפרש במקרה כישלון

**ID Deduplication (2026-05-11):**
- `addGuitar()` עכשיו משתמש ב-`Date.now()` כ-ID (לא maxId+1)
- נוסף `repairGuitarIds()` + endpoint `POST /api/guitars/admin/repair-ids?dry=true`
- בדיקה בפועל: הגיליון היה נקי (0 כפילויות)

**banded range + filter (2026-05-11-12):**
- `applyRowFormatting()` תוקן: מנקה basicFilter לפני הרחבת banding ומשחזר אחר כך
- **סיבה:** Google Sheets דוחה הרחבת banding שחוצה גבול פילטר קיים
- בגיליון החי: banding + filter הורחבו ל-360, 40 שורות רפאים (עם ID בלבד) נמחקו

**דברים לשים לב:**
- `rowIndex` השתנה לחלק מהגיטרות לאחר מחיקת שורות רפאים — לא משנה כי כל חיפוש הוא לפי ID ב-עמודה U
- הגיליון כרגע ב-322 שורות (כולל כותרת) — banding מכסה עד 360

---

### 2026-07-27 — תיקון שורת כפתורים במפה (מנהל, מובייל) + זיהוי מיקום אוטומטי

**קבצים שהשתנו:**
- `frontend/src/pages/MapView.jsx` — useEffect חדש: זיהוי מיקום אוטומטי בטעינת העמוד (מנהל בלבד), נכשל בשקט אם ההרשאה נדחית
- `frontend/src/pages/MapView.module.css` — media query עד 480px שמצמצם ריפוד/גופן בכותרת כדי שהמונה + 3 הפילטרים + כפתור מצב-תצוגה יישארו בשורה אחת; טקסט כפתור מצב-תצוגה מוסתר במובייל (נשאר רק אייקון)

**מה נעשה:**
בעמוד המפה של המנהל, בטלפון צר הכפתור הרביעי ("נקודות") ירד לשורה נפרדת — תוקן ע"י צמצום גדלים ב-breakpoint חדש. בנוסף, בפתיחת העמוד המנהל מזהה את מיקומו אוטומטית (בלי ללחוץ "זהה מיקום עצמי") ורואה מיד את הגיטרות הקרובות.

**דברים לשים לב:**
- הזיהוי האוטומטי רץ פעם אחת בטעינה (כש-guitars נטענו ואין userLocation קיים)

---

### 2026-07-27 — תיקון: שם גיטרה נעלם בלוג פעילות במובייל

**קבצים שהשתנו:**
- `frontend/src/pages/Volunteers.module.css` — במקום להסתיר את עמודות "גיטרה"/"פרטים" מתחת ל-700px, הלוג עובר לפריסת כרטיס מוערמת (grid-template-areas) שמציגה גם את שם הגיטרה

**מה נעשה:**
הנתונים בגיליון היו תמיד תקינים (guitarName נשמר נכון בכל logAction) — הבעיה הייתה CSS שהחביא את העמודה במובייל. עכשיו כל שדה מוצג, רק בפריסה שונה.

---

### 2026-07-28 — תמונה אופציונלית באיסוף גיטרה + הסרת כפתור WhatsApp מהתודה

**קבצים שהשתנו:**
- `frontend/src/pages/MapView.jsx` — input תמונה (capture=environment) במודל "אספת את הגיטרה?", uploadImage() לפני קריאה ל-onMarkCollected; מודל התודה כבר לא מציע לעדכן בוואטסאפ
- `frontend/src/pages/MapView.module.css` — סגנונות preview/כפתור תמונה, הוסר thankyouWaBtn
- `frontend/src/api/client.js` — markGuitarCollected שולח photoUrl
- `frontend/src/App.jsx` — handleMarkCollected מעביר photoUrl הלאה
- `backend/src/routes/volunteers.js` — מסלול mark-collected שומר photoUrl על הגיטרה בקולקציה וגם כותב ל-imageUrl בגיליון הראשי (עמודה V) דרך updateGuitarByRowIndex
- `frontend/src/pages/Volunteers.jsx` + `.module.css` — GuitarChip מציג thumbnail אם יש photoUrl

**מה נעשה:**
כשמתנדב מסמן גיטרה כנאספה, יכול (לא חובה) לצרף תמונה שלה — עוזר לזהות גיטרות בלי שם תורם עליהן כשהן מגיעות. התמונה נשמרת גם בגיליון הראשי (עמודת "תמונה" שכבר הייתה קיימת, 10 גיטרות כבר השתמשו בה) וגם מוצגת ישירות בכרטיס האישור של המנהל. כפתור "עדכן את נועם בוואטסאפ" הוסר כי כבר נשלח מייל אוטומטי בכל סימון איסוף.

**דברים לשים לב:**
- אם ההעלאה נכשלת, האיסוף מסומן בכל זאת (בלי תמונה) — לא חוסם את התהליך

---

### 2026-07-28/29 — עמוד מתנדבים: רשימה אחת ממוינת במקום 3 טאבים

**קבצים שהשתנו:**
- `frontend/src/pages/Volunteers.jsx` — הוסרו טאבי "ממתין לאישור" ו"היסטוריה"; רשימה אחת ("רשימות איסוף") ממוינת לפי `volunteerActivityAt`, כל גיטרה עם badge סטטוס וכפתור מתאים
- `frontend/src/pages/Volunteers.module.css` — ניקוי CSS מת (collectionCardHistory, statusLabel)
- `backend/src/services/sheetsService.js` — עמודה חדשה בגיליון Collections: `volunteer_activity_at` (I, index 8); rowToCollection/createCollection/updateCollectionRow תומכים בה עם נפילה ל-updated_at לרשומות ישנות
- `backend/src/routes/volunteers.js` — `touchVolunteerActivity: true` בקריאות ל-updateCollectionRow בפעולות מתנדב (שמירה/הרחבת רשימה, מחיקת גיטרה, שליחה למנהל, סימון/ביטול איסוף); לא באישור/דחייה של מנהל

**מה נעשה:**
מתנדב שמוסיף/מעדכן רשימה קופץ תמיד לראש הרשימה; כשמישהו שכבר אסף בעבר מוסיף גיטרה נוספת, זו אותה רשומה (לא רשומה חדשה) שפשוט קופצת שוב למעלה עם הישן והחדש יחד. אישורים/דחיות של המנהל לא מזיזים את הסדר, כדי שהרשימה לא "תזוז" באמצע סבב אישורים. שום דבר לא נמחק מהתצוגה — הרשימה עצמה משמשת כהיסטוריה.

**דברים לשים לב:**
- זיהוי המתנדב עדיין נשאר לפי מכשיר (localStorage), לא לפי שם בשרת — הוחלט במפורש להשאיר כך
- collection.status ('active'/'sent'/'closed') כבר לא קובע תצוגה, נשאר בשימוש רק לתיעוד

---

### 2026-07-29 — רשת ביטחון לנתונים + פחות אישורי הרשאה

**קבצים שהשתנו:**
- `backend/scripts/backupSheet.js` — סקריפט חדש: מייצא את כל טאבי הגיליון ל-JSON מקומי עם timestamp
- `.gitignore` — נוסף `backend/backups/`
- `.claude/settings.local.json` — Edit/Write מאושרים מראש על frontend/src, backend/src, backend/scripts

**מה נעשה:**
נוסף כלי גיבוי מקומי מהיר (מעבר להיסטוריית הגרסאות המובנית של Google Sheets) להרצה לפני שינויים מסוכנים. בהינתן רשת הביטחון הזו + git, הורחבו הרשאות העריכה כדי לצמצם אישורים חוזרים על עריכת קבצי מקור.

---

### 2026-07-29 — סימון "קרוב אליי" עם טבעת ירוקה במקום צביעה מלאה

**קבצים שהשתנו:**
- `frontend/src/pages/MapView.jsx` — `makeGuitarIcon`: גיטרה קרובה כבר לא נצבעת ירוק, נשארת בצבע הסטטוס שלה (כתום=ממתין) עם טבעת ירוקה (רווח לבן + קו ירוק ב-box-shadow) מסביב לעיגול; אותו טיפול גם ב-CircleMarker של תצוגת "קיבוץ" (מנהל); באדג' הלג'נדה "גיטרות בסביבתי" עודכן להראות עיגול כתום עם מסגרת ירוקה

**מה נעשה:**
תחילת שדרוג עיצוב לאתר המתנדבים. בעבר גיטרה "קרובה אליי" הייתה מאבדת את צבע הסטטוס האמיתי שלה (מוצג בירוק מלא) — עכשיו הצבע נשאר משמעותי (כתום=ממתין) וה"קרוב" הוא הבלטה נוספת (טבעת + גודל מעט גדול יותר), לא צבע חדש.

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
