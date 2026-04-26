# 🧠 MemoryCurve – Adaptive Memory System

> **Hackathon-ready** spaced-repetition system powered by the **Ebbinghaus Forgetting Curve**.
> Built with **React.js**, **Firebase Firestore**, and **n8n workflow automation**.

---

## 📐 Architecture

```
┌──────────────────────────────────────────────────────┐
│                    React.js Frontend                 │
│  ┌──────────┐ ┌────────────┐ ┌──────────────────┐   │
│  │ Lesson   │ │  Reminder  │ │   Analytics      │   │
│  │ Form     │ │  Panel     │ │   Dashboard      │   │
│  └──────────┘ └────────────┘ └──────────────────┘   │
│       │              ▲              ▲                │
│       ▼              │              │                │
│  ┌──────────────────────────────────────────────┐   │
│  │     Ebbinghaus Engine (ebbinghaus.js)        │   │
│  │     R = e^(-t/S)  •  Adaptive intervals      │   │
│  └──────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────┘
                        │ Firestore SDK
                        ▼
              ┌──────────────────┐
              │  Firebase        │
              │  Firestore       │
              │  ┌────────────┐  │
              │  │  lessons   │  │
              │  │  reminders │  │
              │  └────────────┘  │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  n8n Workflow    │
              │  (automation)   │
              │  Webhook →      │
              │  Compute →      │
              │  Schedule →     │
              │  Notify         │
              └──────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Firebase Account** ([console](https://console.firebase.google.com/))
- **n8n** (optional, for workflow automation)

### 1. Clone & Install

```bash
cd "KLE Hackathon"
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Cloud Firestore** (start in **test mode**)
4. Go to **Project Settings → General → Your apps → Add web app**
5. Copy the Firebase config object
6. Open `src/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "YOUR_ACTUAL_API_KEY",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

### 3. Firestore Security Rules

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lessons/{lessonId} {
      allow read, write: if true;
    }
    match /reminders/{reminderId} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ These rules are open for demo purposes. Restrict for production.

### 4. Run the App

```bash
npm run dev
```

The app will open at `http://localhost:5173`

---

## 🎮 Demo Mode

Demo mode compresses real-world intervals to minutes for live demonstration:

| Real Interval | Demo Interval |
|:---:|:---:|
| Immediate | Immediate |
| 1 Day | 1 minute |
| 3 Days | 3 minutes |
| 7 Days | 7 minutes |
| 14 Days | 10 minutes |
| 30 Days | 15 minutes |

**Demo mode is ON by default.** Toggle it in the lesson form.

### Demo Workflow for Judges

1. Open the app → Demo Mode is already active
2. Add a lesson (e.g., "Neural Networks – Key Concepts")
3. Observe: 6 reminders are scheduled immediately
4. **Wait 1 minute** → First reminder toast appears 🔔
5. Click **"Remembered"** or **"Forgot"** on the reminder
6. Watch analytics update in real-time
7. Add more lessons → all track independently in parallel

---

## 📁 Project Structure

```
KLE Hackathon/
├── public/
│   └── vite.svg                    # Favicon
├── src/
│   ├── components/
│   │   ├── LessonForm.jsx          # Add lessons + demo toggle
│   │   ├── LessonList.jsx          # All logged lessons
│   │   ├── Navbar.jsx              # Navigation + branding
│   │   ├── ReminderPanel.jsx       # Live reminders + feedback
│   │   └── StatsChart.jsx          # Analytics dashboard
│   ├── firebase/
│   │   ├── config.js               # Firebase initialization
│   │   └── firestoreService.js     # All Firestore CRUD operations
│   ├── utils/
│   │   └── ebbinghaus.js           # Forgetting curve engine
│   ├── App.jsx                     # Root component
│   ├── index.css                   # Design system (dark glass)
│   └── main.jsx                    # Entry point
├── functions/
│   ├── index.js                    # Cloud Functions (optional)
│   └── package.json
├── n8n/
│   └── workflow.json               # n8n workflow export
├── firestore.rules                 # Security rules
├── firebase.json                   # Firebase config
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔗 n8n Workflow Setup

### Install n8n

```bash
npm install -g n8n
n8n start
```

### Import Workflow

1. Open n8n at `http://localhost:5678`
2. Go to **Workflows → Import from File**
3. Select `n8n/workflow.json`
4. Update the **Firestore HTTP node** with your actual Firebase project ID
5. Activate the workflow

### Workflow Nodes

| Node | Purpose |
|---|---|
| **Webhook: New Lesson** | Receives POST when a lesson is created |
| **Compute Intervals** | Calculates Ebbinghaus intervals (real or demo) |
| **Write to Firestore** | Creates reminder documents via REST API |
| **Build Notification** | Formats the notification payload |
| **Webhook: Feedback** | Receives user feedback (remembered/forgot) |
| **Adjust Intervals** | Computes adaptive multiplier for future reviews |

---

## 🧮 Ebbinghaus Forgetting Curve

The system uses the forgetting curve formula:

**R = e<sup>−t/S</sup>**

Where:
- **R** = Retention (0 to 1)
- **t** = Time since learning
- **S** = Stability (memory strength)

### Adaptive Intervals

When a user gives feedback:
- **"Remembered"** → Next interval × 1.5 (memory is strong, space out more)
- **"Forgot"** → Next interval × 0.5 (memory is weak, review sooner)

---

## 🗄️ Firestore Collections

### `lessons`

| Field | Type | Description |
|---|---|---|
| topic_name | string | Name of the lesson |
| timestamp | timestamp | When the lesson was created |
| created_at | string | ISO creation timestamp |
| demo_mode | boolean | Whether demo intervals are used |
| status | string | `active` or `completed` |
| feedback_history | array | Array of feedback entries |
| reminder_count | number | Total reminders for this lesson |

### `reminders`

| Field | Type | Description |
|---|---|---|
| lesson_id | string | Reference to parent lesson |
| topic_name | string | Lesson name (denormalized) |
| scheduled_time | string | ISO time when reminder is due |
| interval_label | string | Human-readable interval label |
| sent_status | boolean | Whether notification was sent |
| feedback | string | `remembered`, `forgot`, or null |
| created_at | string | ISO creation timestamp |

---

## ☁️ Cloud Functions (Optional)

The `functions/` directory contains optional Firebase Cloud Functions:

- **`onLessonCreated`** – Firestore trigger that auto-creates reminders
- **`checkDueReminders`** – Runs every minute to find and mark due reminders
- **`triggerN8nWorkflow`** – HTTP endpoint to trigger n8n workflows

Deploy:
```bash
cd functions && npm install
firebase deploy --only functions
```

---

## ✨ Features Summary

| Feature | Status |
|---|:---:|
| Lesson capture with timestamps | ✅ |
| Ebbinghaus forgetting curve scheduling | ✅ |
| Demo mode (compressed intervals) | ✅ |
| In-app toast notifications | ✅ |
| Remembered / Forgot feedback | ✅ |
| Adaptive interval adjustment | ✅ |
| Analytics dashboard (charts) | ✅ |
| Multiple parallel lessons | ✅ |
| Real-time Firestore sync | ✅ |
| n8n workflow automation | ✅ |
| Cloud Functions (optional) | ✅ |
| Responsive design | ✅ |
| Dark glassmorphism UI | ✅ |

---

## 📄 License

MIT – Built for the KLE Hackathon 2026.
