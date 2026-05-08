# Quinta Cafe — Expense Manager

A clean, standalone web app for managing daily and monthly expenses.
Hosted on GitHub Pages. Data lives in your Google Sheets.

## Files

| File | Purpose |
|---|---|
| `index.html` | App structure and markup |
| `styles.css` | All styling |
| `app.js` | All logic, API calls, CRUD operations |
| `WebApp.gs` | Google Apps Script backend (add to your Apps Script project) |

## Setup

### 1. Add the Web App backend
- Open your Apps Script project
- Click **+** next to Files → Script → name it `WebApp`
- Paste the contents of `WebApp.gs`
- Save

### 2. Deploy as Web App
- In Apps Script → **Deploy** → **New Deployment**
- Type: **Web App**
- Execute as: **Me**
- Who has access: **Anyone**
- Click Deploy → copy the URL

### 3. Paste URL into app.js
Open `app.js` and replace line 10:
```js
const API_URL = 'YOUR_WEB_APP_URL_HERE';
```
With your actual deployment URL.

### 4. Push to GitHub and enable Pages
- Push all 4 files to a GitHub repository
- Go to Settings → Pages → Source: main branch / root
- Your app will be live at `https://yourusername.github.io/your-repo/`

## Features
- View, add, edit, delete Daily Expenses
- View, add, edit, delete Monthly Expenses
- Search and filter by category, month
- Summary stats (total records, total amount, latest entry)
- Recurring badge on monthly expenses
- Toast notifications
- Responsive layout

## Notes
- All data reads/writes go directly to your Google Sheet
- No login required — the Web App runs as your Google account
- Keep the Web App URL private if you don't want others to be able to add/edit records
