const { Resend } = require('resend');

const ADMIN_EMAIL = 'Noamge@gmail.com';

function getClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendCollectionEmail({ volunteerName, volunteerAddress, guitars, action, removedGuitar }) {
  if (!process.env.RESEND_API_KEY) return;

  let subject, text;

  if (action === 'removed') {
    const g = removedGuitar;
    subject = `[EchoGuitars] ${volunteerName} הסיר גיטרה מרשימת האיסוף`;
    text = `${volunteerName}${volunteerAddress ? ` (${volunteerAddress})` : ''} הסיר גיטרה מרשימת האיסוף:\n\n• ${g.name}${g.city ? ` — ${g.city}` : ''}${g.street ? `, ${g.street}` : ''}${g.phone ? ` | 📞 ${g.phone}` : ''}\n\nרשימה מעודכנת (${guitars.length} גיטרות):\n${guitars.map(g => `• ${g.name}${g.city ? ` — ${g.city}` : ''}`).join('\n') || '(ריקה)'}`;
  } else {
    subject = `[EchoGuitars] ${volunteerName} שמר רשימת איסוף (${guitars.length} גיטרות)`;
    const lines = guitars.map(g =>
      `• ${g.name}${g.city ? ` — ${g.city}` : ''}${g.street ? `, ${g.street}` : ''}${g.phone ? ` | 📞 ${g.phone}` : ''}`
    ).join('\n');
    text = `${volunteerName}${volunteerAddress ? ` (${volunteerAddress})` : ''} שמר/עדכן רשימת איסוף:\n\n${lines}`;
  }

  try {
    await getClient().emails.send({
      from: 'EchoGuitars <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    console.error('Email send failed (non-fatal):', err.message);
  }
}

module.exports = { sendCollectionEmail };
