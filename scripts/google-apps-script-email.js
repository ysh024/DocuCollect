/**
 * ==============================================================================
 * DocuCollect — Google Apps Script Automated Email Service & Sheet Logger
 * ==============================================================================
 *
 * HOW TO DEPLOY:
 * 1. Open Google Sheets (create a new blank spreadsheet, e.g. "DocuCollect Email Logs")
 * 2. Click Extensions > Apps Script
 * 3. Replace all code in Code.gs with this entire file.
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set Description: "DocuCollect Email Service v1"
 * 7. Set Execute as: "Me"
 * 8. Set Who has access: "Anyone" (crucial so your Next.js app on Vercel can post to it)
 * 9. Click "Deploy" and authorize permissions.
 * 10. Copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 11. Add it to your .env.local / Vercel Environment Variables:
 *     GOOGLE_SCRIPT_EMAIL_URL="https://script.google.com/macros/s/.../exec"
 *
 * PLAN LOGIC & QUOTA PROTECTION:
 * - Free Plan: Only sends essential system emails (OTP verification, welcome, password reset)
 *              Event emails (e.g. client uploaded doc) are logged to sheet but SKIPPED to preserve email limits.
 * - Paid Plans (Starter/Pro/Firm): Sends all event notifications (instant client upload alerts, review alerts).
 * ==============================================================================
 */

const SHEET_NAME = "Email_Logs";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "Empty POST body" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const to = (payload.to || "").trim();
    const subject = (payload.subject || "DocuCollect Notification").trim();
    const htmlBody = payload.html || payload.body || "";
    const eventType = payload.eventType || "general"; // 'auth_otp' | 'welcome' | 'doc_uploaded' | 'doc_reviewed' | 'password_reset'
    const plan = (payload.plan || "free").toLowerCase();

    if (!to) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "Missing recipient 'to' email" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Determine if this email should be sent based on tier limits
    const isEssentialEvent =
      eventType === "auth_otp" ||
      eventType === "welcome" ||
      eventType === "password_reset" ||
      eventType === "license_redeemed";

    const isPaidPlan =
      plan === "starter" ||
      plan === "pro" ||
      plan === "firm" ||
      plan === "paid";

    let sendStatus = "PENDING";
    let statusDetails = "";

    if (isEssentialEvent || isPaidPlan) {
      try {
        MailApp.sendEmail({
          to: to,
          subject: subject,
          htmlBody: htmlBody,
          name: "DocuCollect Portal",
        });
        sendStatus = "SENT";
        statusDetails = "Delivered via Google MailApp";
      } catch (mailErr) {
        sendStatus = "ERROR";
        statusDetails = mailErr.toString();
      }
    } else {
      // Free plan quota conservation: event logged to sheet, email delivery skipped
      sendStatus = "SKIPPED";
      statusDetails = "Skipped: Client event email disabled on Free plan to conserve quota. Upgrade to Starter/Pro to enable automated client upload notifications.";
    }

    // Log transaction to Google Sheet
    logToGoogleSheet({
      date: new Date(),
      recipient: to,
      eventType: eventType,
      plan: plan,
      subject: subject,
      status: sendStatus,
      details: statusDetails,
    });

    return ContentService.createTextOutput(
      JSON.stringify({
        success: sendStatus === "SENT" || sendStatus === "SKIPPED",
        status: sendStatus,
        details: statusDetails,
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "online",
      service: "DocuCollect Google Apps Script Email Service",
      timestamp: new Date().toISOString(),
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Appends audit row to the "Email_Logs" sheet.
 */
function logToGoogleSheet(entry) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Timestamp",
        "Recipient Email",
        "Event Type",
        "Plan Tier",
        "Subject",
        "Status",
        "Details"
      ]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      Utilities.formatDate(entry.date, "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
      entry.recipient,
      entry.eventType,
      entry.plan,
      entry.subject,
      entry.status,
      entry.details
    ]);
  } catch (sheetErr) {
    Logger.log("Failed to log to spreadsheet: " + sheetErr);
  }
}
