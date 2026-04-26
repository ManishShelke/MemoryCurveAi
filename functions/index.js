// ─────────────────────────────────────────────────────────────
// Firebase Cloud Functions – MemoryCurve AI
// ─────────────────────────────────────────────────────────────
//
// Includes:
//   • Auto-create reminders on new lesson
//   • Scheduled check for due reminders (sends email via Resend)
//   • HTTP trigger for n8n workflows
//
// Setup:
//   firebase init functions
//   cd functions && npm install
//   firebase functions:config:set resend.api_key="re_..."
//   firebase deploy --only functions
// ─────────────────────────────────────────────────────────────

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

const db = admin.firestore();

// ── Resend Client ───────────────────────────────────────────
// API key from Firebase Functions config or environment variable
const RESEND_API_KEY = functions.config().resend?.api_key || process.env.RESEND_API_KEY || 're_NeKgiKhS_FymniNCZ7rrh72Qu7wgCRe7c';
const resend = new Resend(RESEND_API_KEY);

// ── Interval Definitions ────────────────────────────────────

const REAL_INTERVALS = [
  { label: 'Immediate',  ms: 0 },
  { label: '1 Day',      ms: 1  * 24 * 60 * 60 * 1000 },
  { label: '3 Days',     ms: 3  * 24 * 60 * 60 * 1000 },
  { label: '7 Days',     ms: 7  * 24 * 60 * 60 * 1000 },
  { label: '14 Days',    ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '30 Days',    ms: 30 * 24 * 60 * 60 * 1000 },
];

const DEMO_INTERVALS = [
  { label: 'Immediate',        ms: 0 },
  { label: '1 min  (1 day)',   ms: 1  * 60 * 1000 },
  { label: '3 min  (3 days)',  ms: 3  * 60 * 1000 },
  { label: '7 min  (7 days)',  ms: 7  * 60 * 1000 },
  { label: '10 min (14 days)', ms: 10 * 60 * 1000 },
  { label: '15 min (30 days)', ms: 15 * 60 * 1000 },
];

// ── Beautiful HTML Email Template ───────────────────────────

function buildReminderEmail(topicName, intervalLabel, userName) {
  const firstName = userName ? userName.split(' ')[0] : 'Learner';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f0d1a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0d1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:linear-gradient(145deg,#1a1726 0%,#231f35 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(168,85,247,0.2);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#ec4899 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                🧠 MemoryCurve AI
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:400;">
                Spaced Repetition Reminder
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#e2e0ea;font-size:18px;line-height:1.6;">
                Hey ${firstName} 👋
              </p>
              <p style="margin:0 0 24px;color:#a09bb5;font-size:15px;line-height:1.7;">
                It's time to review your study material! Based on the <strong style="color:#a855f7;">Ebbinghaus Forgetting Curve</strong>, now is the optimal moment to reinforce your memory.
              </p>

              <!-- Topic Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:linear-gradient(135deg,rgba(124,58,237,0.15) 0%,rgba(168,85,247,0.1) 100%);border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:24px;">
                    <p style="margin:0 0 4px;color:#a09bb5;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
                      📚 Topic to Review
                    </p>
                    <p style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600;">
                      ${topicName}
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background:rgba(168,85,247,0.2);border-radius:20px;padding:6px 14px;">
                          <span style="color:#c084fc;font-size:13px;font-weight:500;">⏱ Interval: ${intervalLabel}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tip -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                <tr>
                  <td style="background:rgba(236,72,153,0.08);border-left:3px solid #ec4899;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;color:#f9a8d4;font-size:13px;line-height:1.6;">
                      💡 <strong>Pro Tip:</strong> Active recall (trying to remember before looking) strengthens neural pathways 3× better than passive re-reading.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Motivational -->
              <p style="margin:32px 0 0;color:#a09bb5;font-size:14px;line-height:1.7;text-align:center;">
                Each review session makes the memory <strong style="color:#a855f7;">exponentially stronger</strong>. You're building lasting knowledge! 🚀
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(168,85,247,0.15);text-align:center;">
              <p style="margin:0;color:#6b6580;font-size:12px;line-height:1.6;">
                Sent by <strong style="color:#a855f7;">MemoryCurve AI</strong> — Your intelligent study companion<br>
                Powered by spaced repetition science 🔬
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Revision-Specific Email Template ────────────────────────

function buildRevisionEmail(topicName, intervalLabel, userName, activities, duration, priority, topics) {
  const firstName = userName ? userName.split(' ')[0] : 'Learner';
  const activitiesHtml = (activities || []).map(a => `<li style="margin:4px 0;color:#e2e0ea;font-size:14px;">${a}</li>`).join('');
  const topicsHtml = (topics || []).map(t => `<span style="display:inline-block;background:rgba(168,85,247,0.2);border-radius:20px;padding:4px 12px;margin:3px;color:#c084fc;font-size:12px;">${t}</span>`).join('');
  const priorityColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#22c55e';

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0d1a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0d1a;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:linear-gradient(145deg,#1a1726 0%,#231f35 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(168,85,247,0.2);">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">📖 Revision Day</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your scheduled study session is ready</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;color:#e2e0ea;font-size:18px;">Hey ${firstName} 👋</p>
          <p style="margin:0 0 24px;color:#a09bb5;font-size:15px;line-height:1.7;">Today's revision session is ready! Follow the plan below to strengthen your memory.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="background:linear-gradient(135deg,rgba(16,185,129,0.15) 0%,rgba(52,211,153,0.1) 100%);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:24px;">
              <p style="margin:0 0 4px;color:#a09bb5;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">📚 ${intervalLabel}</p>
              <p style="margin:0 0 12px;color:#ffffff;font-size:20px;font-weight:600;">${topicName}</p>
              <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                <td style="background:rgba(168,85,247,0.2);border-radius:20px;padding:4px 12px;margin-right:8px;"><span style="color:#c084fc;font-size:12px;">⏱ ${duration || '30 min'}</span></td>
                <td style="width:8px;"></td>
                <td style="background:rgba(${priority === 'high' ? '239,68,68' : priority === 'medium' ? '245,158,11' : '34,197,94'},0.2);border-radius:20px;padding:4px 12px;"><span style="color:${priorityColor};font-size:12px;">Priority: ${priority || 'medium'}</span></td>
              </tr></table>
            </td></tr>
          </table>
          ${activitiesHtml ? `<div style="margin-top:20px;"><p style="color:#a09bb5;font-size:13px;font-weight:600;margin:0 0 8px;">✅ Today's Activities:</p><ul style="margin:0;padding-left:20px;">${activitiesHtml}</ul></div>` : ''}
          ${topicsHtml ? `<div style="margin-top:16px;"><p style="color:#a09bb5;font-size:13px;font-weight:600;margin:0 0 8px;">🎯 Focus Topics:</p><div>${topicsHtml}</div></div>` : ''}
          <p style="margin:32px 0 0;color:#a09bb5;font-size:14px;text-align:center;">Consistency beats intensity. Keep showing up! 🚀</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(16,185,129,0.15);text-align:center;">
          <p style="margin:0;color:#6b6580;font-size:12px;">Sent by <strong style="color:#10b981;">MemoryCurve AI</strong> — 7-Day Revision System 🔬</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Firestore Trigger: Auto-create reminders on new lesson ──

exports.onLessonCreated = functions.firestore
  .document('lessons/{lessonId}')
  .onCreate(async (snap, context) => {
    const lesson = snap.data();
    const lessonId = context.params.lessonId;
    const demoMode = lesson.demo_mode || false;
    const baseTime = lesson.timestamp?.toMillis() || Date.now();
    const intervals = demoMode ? DEMO_INTERVALS : REAL_INTERVALS;

    const batch = db.batch();

    intervals.forEach((interval) => {
      const ref = db.collection('reminders').doc();
      batch.set(ref, {
        lesson_id: lessonId,
        userId: lesson.userId || lesson.user_id || null,
        user_id: lesson.user_id || lesson.userId || null,
        user_email: lesson.user_email || null,
        user_name: lesson.user_name || null,
        topic_name: lesson.topic_name,
        interval_label: interval.label,
        scheduled_time: new Date(baseTime + interval.ms).toISOString(),
        sent_status: false,
        feedback: null,
        type: 'lesson',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`Created ${intervals.length} reminders for lesson: ${lesson.topic_name}`);
  });

// ── Scheduled Function: Check for due reminders & send emails ──

exports.checkDueReminders = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = new Date().toISOString();

    const snapshot = await db
      .collection('reminders')
      .where('sent_status', '==', false)
      .where('scheduled_time', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log('No due reminders found.');
      return null;
    }

    const batch = db.batch();
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Try to send email if user_email exists
      if (data.user_email) {
        try {
          const isRevision = data.type === 'revision';
          const emailHtml = isRevision
            ? buildRevisionEmail(data.topic_name, data.interval_label, data.user_name, data.revision_activities, data.revision_duration, data.revision_priority, data.revision_topics)
            : buildReminderEmail(data.topic_name, data.interval_label, data.user_name);
          const emailSubject = isRevision
            ? `📖 Revision Day: ${data.topic_name}`
            : `🧠 Time to Review: ${data.topic_name} (${data.interval_label})`;

          await resend.emails.send({
            from: 'MemoryCurve AI <onboarding@resend.dev>',
            to: [data.user_email],
            subject: emailSubject,
            html: emailHtml,
          });
          emailsSent++;
          console.log(`✅ Email sent to ${data.user_email} for topic: ${data.topic_name}`);
        } catch (error) {
          emailsFailed++;
          console.error(`❌ Failed to send email to ${data.user_email}:`, error.message);
        }
      } else {
        console.log(`⚠️ No email for reminder ${doc.id}, skipping email.`);
      }

      // Mark as sent regardless (to avoid re-processing)
      batch.update(doc.ref, {
        sent_status: true,
        email_sent: !!data.user_email,
        sent_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`Processed ${snapshot.size} reminders. Emails sent: ${emailsSent}, failed: ${emailsFailed}`);

    return null;
  });

// ── HTTP Endpoint: Send a test email ────────────────────────

exports.sendTestEmail = functions.https.onRequest(async (req, res) => {
  const { email, name } = req.body || req.query;

  if (!email) {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }

  try {
    const result = await resend.emails.send({
      from: 'MemoryCurve AI <onboarding@resend.dev>',
      to: [email],
      subject: '🧠 Welcome to MemoryCurve AI – Test Notification',
      html: buildReminderEmail('Sample Topic – Introduction to Spaced Repetition', 'Test', name || 'Student'),
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── HTTP Function: Trigger n8n workflow ─────────────────────

exports.triggerN8nWorkflow = functions.https.onRequest(async (req, res) => {
  const { topic_name, lesson_id, timestamp, demo_mode } = req.body;

  try {
    const n8nUrl = 'http://localhost:5678/webhook/new-lesson';

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_name, lesson_id, timestamp, demo_mode }),
    });

    const result = await response.json();
    res.status(200).json({ success: true, n8n_response: result });
  } catch (error) {
    console.error('Failed to trigger n8n:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
