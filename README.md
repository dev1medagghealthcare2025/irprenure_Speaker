# IRPRENEUR Speaker Registration (Static)

A simple, modern HTML/CSS/JS registration form that submits entries to a Google Sheet via Google Apps Script.

## Files
- `index.html` — UI for the registration dashboard
- `style.css` — Styling (responsive, dark theme)
- `script.js` — Validation and submission logic

## Form Fields
- Name
- City
- Email
- Phone
- Organization
- Designation

All fields are required.

---

## Setup: Connect to Google Sheets

Follow these steps to receive submissions directly into a Google Sheet.

### 1) Create a Google Sheet
1. Go to Google Drive and create a new Google Sheet (e.g., `IRPRENEUR Speaker Registrations`).
2. In row 1 (headers), add the following columns exactly in this order:
   - `Timestamp`
   - `Name`
   - `City`
   - `Email`
   - `Phone`
   - `Organization`
   - `Designation`

### 2) Create an Apps Script project
1. In the Google Sheet, click `Extensions` > `Apps Script`.
2. Delete any default code and paste the script below into `Code.gs`.

```javascript
// Code.gs (Google Apps Script)
// Receives JSON via POST and appends to the attached Google Sheet.
// Make sure the sheet has headers: Timestamp, Name, City, Email, Phone, Organization, Designation

function doPost(e) {
  try {
    const origin = e?.headers?.origin || '*';

    if (!e.postData || !e.postData.contents) {
      return buildResponse({ status: 'error', message: 'No payload provided' }, origin, 400);
    }

    const data = JSON.parse(e.postData.contents);

    // Basic validation
    const required = ['name', 'city', 'email', 'phone', 'organization', 'designation'];
    for (const field of required) {
      if (!data[field] || String(data[field]).trim() === '') {
        return buildResponse({ status: 'error', message: `Missing: ${field}` }, origin, 400);
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    sheet.appendRow([
      new Date(),
      data.name,
      data.city,
      data.email,
      data.phone,
      data.organization,
      data.designation,
    ]);

    return buildResponse({ status: 'success' }, origin, 200);
  } catch (err) {
    const origin = e?.headers?.origin || '*';
    return buildResponse({ status: 'error', message: String(err) }, origin, 500);
  }
}

function buildResponse(obj, origin, code) {
  const output = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  const resp = HtmlService.createHtmlOutput(output.getContent());

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const response = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setContent(JSON.stringify(obj))
    .setAsJson();
}

function doOptions(e) {
  // Handle CORS preflight if needed
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

Notes:
- New Apps Script runtime supports only certain ways to set headers. If CORS blocks appear, see the alternative approach below.

### Alternative (recommended): Web App with JSON and CORS
Replace the entire content with this version that sets CORS headers using the `TextOutput` from `ContentService` in the advanced way:

```javascript
function doPost(e) {
  try {
    const origin = e?.headers?.origin || '*';
    const data = JSON.parse(e.postData.contents || '{}');

    const required = ['name', 'city', 'email', 'phone', 'organization', 'designation'];
    for (const f of required) {
      if (!data[f] || String(data[f]).trim() === '') throw new Error('Missing: ' + f);
    }

    const sheet = SpreadsheetApp.getActive().getActiveSheet();
    sheet.appendRow([
      new Date(),
      data.name,
      data.city,
      data.email,
      data.phone,
      data.organization,
      data.designation,
    ]);

    return jsonResponse({ status: 'success' }, origin);
  } catch (err) {
    const origin = e?.headers?.origin || '*';
    return jsonResponse({ status: 'error', message: String(err) }, origin, 400);
  }
}

function doOptions(e) {
  const origin = e?.headers?.origin || '*';
  return jsonResponse({}, origin, 204);
}

function jsonResponse(obj, origin, code) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);

  // Workaround to set CORS headers via the Web App (Deployment must be as Web App)
  const response = HtmlService.createHtmlOutput(JSON.stringify(obj));
  const rc = response.getResponse();
  rc.setStatusCode(code || 200);
  rc.setHeader('Access-Control-Allow-Origin', origin);
  rc.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  rc.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}
```

Important: Apps Script header handling is limited. If headers don’t apply, set Web App access to "Anyone with the link" and test; many browsers will still submit successfully when posting JSON. If you hit CORS issues, consider using a simple Google Form + Apps Script, or a proxy like Cloudflare Workers.

### 3) Deploy as a Web App
1. Click `Deploy` > `New deployment`.
2. Select `Web app`.
3. Description: `Speaker Registration API`.
4. Execute as: `Me`.
5. Who has access: `Anyone` or `Anyone with the link`.
6. Click `Deploy` and copy the Web App URL.

### 4) Paste the URL into the frontend
1. Open `script.js`.
2. Replace the constant value:
   ```js
   const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```
3. Save the file and reload `index.html` in your browser.

### 5) Test
- Open `index.html` in a browser and submit the form.
- Check your Google Sheet; a new row should appear with your data and a timestamp.

---

## Troubleshooting
- CORS error in console:
  - Ensure the Web App is deployed as `Anyone` and you’re using the `/exec` URL (not `/dev`).
  - Try the Alternative JSON response method above. Re-deploy after changes.
  - As a fallback, change the fetch to use `mode: 'no-cors'` in `script.js` (you will not receive JSON back, but the row will be appended):
    ```js
    fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    ```
- Sheet doesn’t update:
  - Make sure you edited the script connected to the same spreadsheet.
  - Ensure the active sheet is correct (first sheet by default) or select by name:
    ```javascript
    const sheet = SpreadsheetApp.getActive().getSheetByName('Sheet1');
    ```
- Getting `Missing: field` error:
  - All fields are required; ensure every input is filled.

---

## Customize
- Update colors and branding in `style.css`.
- Add fields by duplicating a `.form-field` in `index.html`, then include the field in the payload in `script.js` and in the Apps Script `appendRow`.

## License
Use freely for your event.
