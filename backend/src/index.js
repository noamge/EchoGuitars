require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const guitarsRouter = require('./routes/guitars');
const donorsRouter = require('./routes/donors');
const uploadRouter = require('./routes/upload');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/guitars', guitarsRouter);
app.use('/api/donors', donorsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/debug', async (req, res) => {
  const { google } = require('googleapis');
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const info = {
    sheetId: sheetId ? sheetId.slice(0, 10) + '...' : 'MISSING',
    email: email || 'MISSING',
    keyPresent: !!key,
    keyStartsWith: key ? key.slice(0, 30) : 'MISSING',
    keyLength: key ? key.length : 0,
    keyHasBeginMarker: key ? key.includes('BEGIN PRIVATE KEY') : false,
    keyHasNewlines: key ? key.includes('\n') : false,
    keyHasLiteralBackslashN: key ? key.includes('\\n') : false,
  };

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    info.authStatus = token.token ? 'SUCCESS — got access token' : 'FAILED — no token';

    // Now actually try to read the sheet
    const sheets = google.sheets({ version: 'v4', auth });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'גיליון1!A1:B3',
    });
    info.sheetsTest = 'SUCCESS — rows: ' + (result.data.values?.length || 0);
  } catch (err) {
    info.sheetsTest = 'ERROR: ' + err.message;
  }

  res.json(info);
});

app.listen(PORT, () => {
  console.log(`🎸 EchoGuitars server running on http://localhost:${PORT}`);
});
