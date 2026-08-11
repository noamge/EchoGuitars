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

### 2026-07-29 — סבב שדרוג עיצוב: skeleton טעינה, מצב כהה, קונפטי, תגי סוג גיטרה

**קבצים שהשתנו:**
- `frontend/src/pages/MapView.jsx` — הוסר toast "בפתיחה ראשונה..."; נוסף skeleton אמיתי (מפה מנצנצת + כרטיסי שלד ברשימת "בקרבתי") בזמן טעינה; קונפטי חד-פעמי במודל התודה; `makeGuitarIcon` מקבל `guitarType` ומציג תג-אות צבעוני בפינה (ק/א/ח); באדג'ים של סטטוס (פופאפ + פאנל האיסוף) הפכו מטקסט צבוע ל-pill badge עם רקע, תואם לעיצוב עמוד המנהל
- `frontend/src/pages/MapView.module.css` — סגנונות skeleton (shimmer), קונפטי, תגי סוג, pill badges, `.nearbyCard` עבר ל-`var(--radius)` ו-`.nearbyName` ל-font-weight 700 (יישור לשפה חזותית אחידה)
- `frontend/src/index.css` — `@media (prefers-color-scheme: dark)` עם פלטת צבעים כהה מלאה (כל משתני ה-CSS הקיימים); `color-scheme: light dark` כדי ששדות קלט/פקדים ילידיים יתאימו אוטומטית

**מה נעשה:**
ביצוע 4 מתוך 6 הצעות עיצוב: (2) skeleton טעינה אמיתי במקום הודעת התנצלות, (3) איחוד השפה החזותית של תגיות סטטוס לפורמט pill אחיד, (4) תג צבע/אות לזיהוי סוג גיטרה על סמני המפה (אין emoji/אייקון שמבדיל צורת גיטרה בגודל סמן קטן, אז נבחר תג ק/א/ח בפינה), (5) מצב כהה שעוקב אחרי הגדרת הטלפון/דפדפן — לא צריך מתג באפליקציה. (1) מד התקדמות אישי ו-(6 בוצע גם) אנימציית קונפטי בתודה.

**דברים לשים לב:**
- מסך ההתחברות (`Login.jsx`) נשאר קבוע בהיר במכוון — הוא בנוי על אובייקטי style inline (לא CSS vars/מודולים), כך שלא יכול להגיב ל-`prefers-color-scheme`. דומה בכוונה למסך ה-splash שגם הוא גרדיאנט כהה קבוע. אם ירצו שגם הוא יגיב למצב כהה/בהיר — צריך לכתוב אותו מחדש עם CSS modules.
- badge-ים של סטטוס (למשל pill-ים בצבעי פסטל) נשארים באותם צבעים גם במצב כהה במכוון — קריא כ"תגית צבעונית על רקע כהה", תבנית מקובלת.

---

### 2026-07-29 — שיפור: spinner אמיתי + הודעת "טעינה ראשונית" חזרה, בצורה אלגנטית

**קבצים שהשתנו:**
- `frontend/src/pages/MapView.jsx` — ה-skeleton של המפה מקבל תוכן מרכזי: spinner מסתובב + "טוען את המפה והגיטרות…" + "בפתיחה ראשונה זה עשוי לקחת כמה שניות", במקום רק נצנוץ
- `frontend/src/pages/MapView.module.css` — `.mapSkeletonContent/.mapSkeletonSpinner/.mapSkeletonText/.mapSkeletonSubtext`

**מה נעשה:**
נצנוץ בלבד לא נקרא מספיק ברור כ"טעינה" והמשתמש ביקש שההודעה על זמן טעינה ראשונית תחזור — הפעם משולבת בתוך ה-skeleton עצמו (לא toast נפרד שמחליק מלמעלה כמו קודם).

---

### 2026-07-29 — חיפוש שם תורם בשורת החיפוש של המפה (מנהל)

**קבצים שהשתנו:**
- `frontend/src/pages/MapView.jsx` — `handleManualSearch` (רק כש-`!isVolunteer`): מנסה קודם להתאים שם תורם מתוך הגיטרות הטעונות; התאמה יחידה עם קואורדינטות → `setFilter('הכל')` + `setHighlightedId` (ממקד/מדגיש במפה, מנקה פילטר סטטוס שעלול להסתיר אותה); התאמה יחידה בלי קואורדינטות → alert עם הכתובת הרשומה; כמה התאמות → alert עם רשימת שמות לצמצום חיפוש; אין התאמה → נופל בחזרה לחיפוש כתובת/Nominatim הרגיל. placeholder של תיבת החיפוש למנהל עודכן.

**מה נעשה:**
אותה שורת חיפוש שכבר הייתה קיימת (עיר/כתובת) מזהה עכשיו גם שם תורם. אם התורם קיים בנתונים אבל לא מזוהה גאוגרפית — מוצגת התרעה עם הכתובת הרשומה במקום פשוט "לא נמצא".

**דברים לשים לב:**
- הפיצ'ר פעיל למנהל בלבד (התאמה לפי "אם הוא קיים בטבלה" — TableView הוא מסך מנהל); שורת החיפוש של המתנדב (למעלה, "כתובת לאיסוף") לא השתנתה.

---

### 2026-08-07 — תיקון: רשימות איסוף כפולות לאותו מתנדב

**קבצים שהשתנו:**
- `backend/src/services/sheetsService.js` — נוספה `deleteCollectionRow(id)` (אותו pattern כמו `deleteGuitarRow`), מיוצאת מהמודול
- `backend/src/routes/volunteers.js` — `POST /collection`: כשמגיעה בקשה בלי `collectionId`, לפני יצירת רשומה חדשה מחפש ב-`getCollections()` אם כבר יש `Collection` פעילה (`status !== 'closed'`) עם אותו `volunteerName` (אחרי trim) ומרחיב אותה במקום ליצור כפולה

**מה נעשה:**
זוהתה בעיה אצל יורם טוליאן: שתי רשומות `Collection` נפרדות תחת אותו שם — כנראה כי ה-`localStorage` עם `volunteer_collection_id` אבד לו (מכשיר/דפדפן אחר) בין ביקור לביקור, אז "שמירה" שנייה יצרה רשומה חדשה לגמרי במקום להרחיב את הקיימת. כשסימן גיטרות כ"נאספו" זה עדכן את הרשומה החדשה (הריקה כמעט) ולא את הרשומה הראשונה שהמנהל כבר הכיר — נראה למנהל כאילו "נפתחה רשימה נוספת" במקום שהעדכון יופיע על גבי הרשימה הקיימת.

**תיקון נתונים חד-פעמי (רץ בפועל):**
גובה `backend/scripts/backupSheet.js` לפני השינוי. שתי הרשומות של יורם טוליאן מוזגו לאחת (`COL-1785222779709`): גיטרות ששני הרשומות חלקו קיבלו את הסטטוס העדכני (`pending`, כדי שיופיע כפתור אישור), גיטרות חדשות מהרשומה השנייה נוספו לרשימה הקיימת, הרשומה הכפולה (`COL-1785911176187`) נמחקה, ונרשמה פעולת `collections_merged` בלוג.

**תיקון קוד (מונע הישנות):** ה-server עכשיו בודק לפי שם מתנדב כרשת ביטחון אם ה-client לא הביא `collectionId` — לא משנה את מנגנון הזיהוי הראשי (עדיין לפי מכשיר), רק מונע כפילות כשהזיהוי המקומי אבד.

**דברים לשים לב:**
- ההתאמה היא לפי שם מדויק (אחרי trim, בלי נרמול נוסף) — שני מתנדבים עם שם זהה בדיוק ורשימה פעילה יתמזגו בטעות. לא טופל כי לא רלוונטי בהיקף המתנדבים הנוכחי.

---

### 2026-08-07 — מחיקת גיטרה מרשימת איסוף (אוטומטית + ידנית ע"י מנהל)

**קבצים שהשתנו:**
- `backend/src/routes/guitars.js` — `DELETE /api/guitars/:id`: אחרי מחיקת השורה מהגיליון הראשי, סורק את כל ה-`Collections` ומסיר את הגיטרה מכל רשימה שהחזיקה אותה (`updateCollectionRow` בלי `touchVolunteerActivity` — זו פעולת ניקוי מנהל, לא פעילות מתנדב), ורושם `guitar_unlocked` בלוג לכל הסרה
- `frontend/src/pages/Volunteers.jsx` — כפתור "✕" חדש על כל `GuitarChip` בסטטוס `selected`/`pending`, קורא ל-`removeGuitarFromCollection` (endpoint קיים מראש, `DELETE /volunteers/collection/:id/guitar/:guitarId` — היה בשימוש רק בצד המתנדב עד כה) ומעדכן state מקומי; כרטיסיית מתנדב שמתרוקנת מגיטרות נעלמת מהתצוגה
- `frontend/src/pages/Volunteers.module.css` — `.removeBtn`

**מה נעשה:**
שני מסלולים להסרת גיטרה מרשימת איסוף של מתנדב, לפי מה שביקשת:
1. **אוטומטי:** מחיקת רשומת גיטרה לגמרי מהטבלה הראשית (TableView, "מחק") — אם היא הייתה שמורה ברשימת איסוף של מישהו, היא מוסרת משם גם כן במקביל (לא נשארת "רפאים" ברשימה).
2. **ידני:** במסך "מתנדבים", למנהל יש עכשיו כפתור ✕ ליד כל גיטרה בסטטוס "מתוכנן לאיסוף"/"ממתין לאישור" — מסיר אותה מהרשימה של אותו מתנדב בלבד (בלי למחוק את רשומת הגיטרה עצמה) ומשחרר אותה חזרה למפה לבחירת מתנדב אחר. שימושי כשמתברר שהגיטרה כבר נמסרה בדרך אחרת.

**דברים לשים לב:**
- כפתור ה-✕ לא מוצג על גיטרות בסטטוס סופי (`approved`/`admin_collected`/`rejected`) — אלה כבר שיקפו מצב סגור בגיליון הראשי, הסרה מהרשימה בשלב הזה לא הייתה משנה כלום שם.

---

### 2026-08-11 — "לא רלוונטי" ו"נמכר" (עם מחיר)

**עמודות חדשות בגיליון הראשי (AA–AC), עם כותרות שנוספו ידנית:**
- `AA` — לא רלוונטי (TRUE/FALSE)
- `AB` — נמכר (TRUE/FALSE)
- `AC` — מחיר מכירה (מספר, רלוונטי רק כש-AB=TRUE)

**קבצים שהשתנו:**
- `backend/src/services/sheetsService.js` — `COL.IRRELEVANT/SOLD/SOLD_PRICE`; `rowToGuitar`, `getAllGuitars`, `updateGuitarByRowIndex`, `addGuitar` מורחבים ל-3 השדות החדשים; טווחי הקריאה/כתיבה של שורת גיטרה הורחבו מ-`A:W` ל-`A:AC`; `applyRowFormatting` מוסיף checkbox validation גם לעמודות אלה
- `backend/src/routes/guitars.js` — פונקציית עזר משותפת `purgeGuitarFromCollections` (שימשה קודם רק ב-DELETE, עכשיו גם ב-PATCH); `PATCH /:id` — כשמסמנים `irrelevant:true` או `sold:true`, הגיטרה משתחררת (`unlockGuitar`) ומוסרת מכל רשימת איסוף פעילה; `GET /map` מסנן גיטרות `irrelevant` — לא מוצגות במפה (למנהל ולמתנדב כאחד), כי אף אחד לא ייאסוף אותן יותר
- `frontend/src/pages/QuickEdit.jsx` — שני tiles חדשים: **🚫 לא רלוונטי** (ללא שדות נוספים) ו-**💰 גיטרה נמכרה** (שדה חובה "מחיר מכירה"); ולידציות הדדיות (לא ניתן לתרום גיטרה שנמכרה/לא רלוונטית ולהפך, לא ניתן לסמן פעמיים); אזהרה (לא חוסמת) אם מסמנים "לא רלוונטי" על גיטרה שכבר נאספה; זרימת "הוסף תורם חדש" מוסתרת עבור שתי הפעולות האלה (רלוונטיות רק לגיטרה שכבר קיימת במערכת)
- `frontend/src/pages/TableView.jsx` + `.module.css` — עמודה חדשה "לא רלוונטי" עם toggle button (מסמן/מבטל ישירות מהטבלה, בדיוק כמו "תוקן") — זה גם מסלול ה-undo אם סימנו בטעות; עמודה חדשה "נמכר" — תצוגה בלבד (💰 ₪X), נערכת רק דרך עדכון מהיר

**מה נעשה:**
שני תרחישים חדשים בעבודה השוטפת:
1. **תורם חוזר בו** — נרשם לתרום אבל בסוף מסר את הגיטרה למישהו אחר. מסמנים "לא רלוונטי" בעדכון מהיר (או toggle בטבלה) — הרשומה נשארת (לתיעוד היסטורי, מוצגת עם תגית אפורה תמיד בטבלה), אבל יורדת מהמפה ומכל רשימת איסוף פעילה של מתנדב.
2. **מכירה במקום תרומה** — אחרי איסוף בפועל, לפעמים המחליט למכור גיטרה במקום לתרום. מסמנים "גיטרה נמכרה" בעדכון מהיר עם מחיר, מקביל לזרימת "גיטרה נתרמה" הקיימת (גם מסמן `collected:true` אוטומטית).

**דברים לשים לב:**
- לא נוסף כרטיס סטטיסטיקה של סה"כ הכנסות ממכירה בדשבורד — הוחלט במפורש להסתפק בתיעוד לכל גיטרה בשלב זה
- מצב ה-AI החופשי (`AiMode`) לא הורחב לפעולות האלה — נשאר לפעולה ידנית ב-tiles בלבד
- העמודות X/Y/Z נשארות שמורות למטא-דאטה חד-תאית (skipped/thanked/verified address ids) — העמודות החדשות הותחלו ב-AA בכוונה כדי לא לערבב

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
