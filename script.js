// IRPRENEUR Speaker Registration - Client Script
// Replace the URL below after you deploy your Google Apps Script web app.
const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzA-a-f3j25BFZFHMt4omZo-QnRApw7sZ0aVRrIyGwlcwAKDU8yGfSq7ukDzq15KTY8Mw/exec"; // Provided deployment /exec URL
// If running on http(s), use our Vercel proxy for CORS-free submission; if on file://, hit Apps Script directly
const SUBMIT_ENDPOINT = (location.protocol === 'http:' || location.protocol === 'https:')
  ? '/api/submit'
  : APPS_SCRIPT_WEB_APP_URL;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function showToast(message, type = "success") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

function setLoading(isLoading) {
  const btn = $("#submitBtn");
  const inputs = $$("input, button");
  if (isLoading) {
    btn.classList.add("loading");
    inputs.forEach((el) => (el.disabled = true));
  } else {
    btn.classList.remove("loading");
    inputs.forEach((el) => (el.disabled = false));
  }
}

function validateForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  let valid = true;

  // Helpers
  const setErr = (name, msg) => {
    const el = document.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = msg || "";
  };

  ["name", "city", "email", "phone", "organization", "designation"].forEach((f) => setErr(f, ""));

  // Required
  for (const [key, value] of Object.entries(data)) {
    if (!value || String(value).trim() === "") {
      setErr(key, "This field is required");
      valid = false;
    }
  }

  // Email
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  if (data.email && !emailRe.test(data.email)) {
    setErr("email", "Enter a valid email address");
    valid = false;
  }

  // Phone (basic validation: digits, +, -, spaces, between 7 and 15 chars after stripping non-digits)
  if (data.phone) {
    const digits = (data.phone.match(/\d/g) || []).length;
    if (digits < 7 || digits > 15) {
      setErr("phone", "Enter a valid phone number");
      valid = false;
    }
  }

  return { valid, data };
}

function buildFetchInit(payload, forceNoCors = false) {
  const isFile = location.protocol === 'file:';
  const useNoCors = forceNoCors || isFile;
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
  if (useNoCors) init.mode = "no-cors";
  return init;
}

async function submitToAppsScript(payload) {
  // Expecting Apps Script to accept JSON and return JSON
  try {
    const fetchInit = buildFetchInit(payload);
    const res = await fetch(SUBMIT_ENDPOINT, fetchInit);

    // If we're in no-cors mode (file://) the response will be opaque (status 0).
    // We cannot read it, but the request was sent. Treat as success and ask user to verify in Sheet.
    if (res.type === 'opaque' || res.status === 0) {
      return { status: "success", message: "Submitted with CORS fallback (opaque response). Verify in Sheet." };
    }

    // If your Apps Script is not returning CORS headers, this may fail.
    // Follow README.md to configure CORS in Apps Script.
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Submission failed (${res.status}). ${text}`.trim());
    }

    const json = await res.json().catch(() => null);
    if (!json || json.status !== "success") {
      throw new Error(json && json.message ? json.message : "Unexpected server response");
    }
    return json;
  } catch (err) {
    // CORS fallback: if fetch fails due to CORS (TypeError/Failed to fetch), try no-cors as a best-effort submit
    const isCorsLike = err && (err.name === "TypeError" || /Failed to fetch|CORS/i.test(String(err)));
    if (isCorsLike) {
      await fetch(SUBMIT_ENDPOINT, buildFetchInit(payload, true)).catch(() => {});
      // We cannot read the response in no-cors mode. Inform the user to check the sheet.
      return { status: "success", message: "Submitted with CORS fallback (verify in Sheet)" };
    }
    throw err;
  }
}

function init() {
  // Year in footer
  $("#year").textContent = new Date().getFullYear();

  const form = $("#registrationForm");
  const resetBtn = $("#resetBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { valid, data } = validateForm(form);
    if (!valid) {
      showToast("Please fix the errors and try again.", "error");
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      name: data.name.trim(),
      city: data.city.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      organization: data.organization.trim(),
      designation: data.designation.trim(),
    };

    if (!APPS_SCRIPT_WEB_APP_URL || APPS_SCRIPT_WEB_APP_URL.includes("PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE")) {
      showToast("Configure the Apps Script URL in script.js before submitting.", "error");
      return;
    }

    try {
      setLoading(true);
      const result = await submitToAppsScript(payload);
      if (result && result.message && /fallback/i.test(result.message)) {
        showToast("Submitted. Please check Google Sheet (CORS fallback used).", "success");
      } else {
        showToast("Registration submitted successfully!", "success");
      }
      form.reset();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to submit. Try reloading or deploying Apps Script with CORS.", "error");
    } finally {
      setLoading(false);
    }
  });

  resetBtn.addEventListener("click", () => {
    $$(".error").forEach((e) => (e.textContent = ""));
  });
}

document.addEventListener("DOMContentLoaded", init);
