const { Resend } = require('resend');

const ADMIN_EMAIL = 'noamge@gmail.com';

function getClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendCollectionEmail({ volunteerName, volunteerAddress, guitars, action, removedGuitar }) {
  if (!process.env.RESEND_API_KEY) return;

  let subject, text;

  if (action === 'collected') {
    const g = guitars[0];
    subject = `[EchoGuitars] ${volunteerName} סימן שאסף: ${g?.name || ''}`;
    text = `${volunteerName}${volunteerAddress ? ` (${volunteerAddress})` : ''} סימן שאסף את הגיטרה:\n\n• ${g?.name}${g?.city ? ` — ${g.city}` : ''}${g?.street ? `, ${g.street}` : ''}${g?.phone ? ` | 📞 ${g.phone}` : ''}\n\nממתין לאישורך במערכת.`;
  } else if (action === 'removed') {
    const g = removedGuitar;
    subject = `[EchoGuitars] ${volunteerName} הסיר גיטרה מרשימת האיסוף`;
    text = `${volunteerName}${volunteerAddress ? ` (${volunteerAddress})` : ''} הסיר גיטרה מרשימת האיסוף:\n\n• ${g.name}${g.city ? ` — ${g.city}` : ''}${g.street ? `, ${g.street}` : ''}${g.phone ? ` | 📞 ${g.phone}` : ''}\n\nרשימה מעודכנת (${guitars.length} גיטרות):\n${guitars.map(g => `• ${g.name}${g.city ? ` — ${g.city}` : ''}`).join('\n') || '(ריקה)'}`;
  } else {
    subject = `[EchoGuitars] ${volunteerName} שמר/עדכן רשימת איסוף (${guitars.length} גיטרות)`;
    const lines = guitars.map(g =>
      `• ${g.name}${g.city ? ` — ${g.city}` : ''}${g.street ? `, ${g.street}` : ''}${g.phone ? ` | 📞 ${g.phone}` : ''}`
    ).join('\n');
    text = `${volunteerName}${volunteerAddress ? ` (${volunteerAddress})` : ''} שמר/עדכן רשימת איסוף:\n\n${lines}`;
  }

  try {
    const result = await getClient().emails.send({
      from: 'EchoGuitars <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject,
      text,
    });
    if (result?.error) {
      console.error('Resend error:', JSON.stringify(result.error));
    } else {
      console.log('Email sent OK, id:', result?.data?.id);
    }
  } catch (err) {
    console.error('Email send failed:', err.message, err.response?.data || '');
  }
}

module.exports = { sendCollectionEmail };
