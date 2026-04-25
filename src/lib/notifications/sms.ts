/**
 * SMS sending for parent notifications.
 *
 * Currently MOCKED — logs to the notification_log table and the server console
 * but does not actually call any SMS provider. To enable real SMS:
 *
 *   1. Add TERMII_API_KEY and TERMII_SENDER_ID secrets to Lovable Cloud
 *   2. Replace the body of `dispatchSms` below with a real fetch() call
 *   3. Done — every other part of the system (admin Notification Center,
 *      resend buttons, audit log) keeps working without changes.
 *
 * Termii API reference (for when you have a key):
 *   POST https://api.ng.termii.com/api/sms/send
 *   body: { to, from: TERMII_SENDER_ID, sms, type: "plain", channel: "generic", api_key }
 */
export interface SmsDispatchResult {
  status: "mock_sent" | "sent" | "failed";
  providerResponse: Record<string, unknown>;
}

export async function dispatchSms(to: string, message: string): Promise<SmsDispatchResult> {
  // === MOCK MODE ===
  // Pretty-print to server logs so you can see exactly what would have been sent
  // eslint-disable-next-line no-console
  console.log(`[MOCK SMS] -> ${to}\n${message}\n`);

  return {
    status: "mock_sent",
    providerResponse: {
      mock: true,
      note: "Termii not configured. Replace dispatchSms() body to enable real sending.",
      to,
      preview: message.slice(0, 160),
      timestamp: new Date().toISOString(),
    },
  };

  /* === REAL TERMII CODE (uncomment + add secrets when ready) ===
  const apiKey = process.env.TERMII_API_KEY;
  const sender = process.env.TERMII_SENDER_ID || "EduLink";
  if (!apiKey) {
    return { status: "failed", providerResponse: { error: "TERMII_API_KEY missing" } };
  }
  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from: sender,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });
    const data = await res.json();
    return {
      status: res.ok ? "sent" : "failed",
      providerResponse: data,
    };
  } catch (err) {
    return { status: "failed", providerResponse: { error: String(err) } };
  }
  */
}
