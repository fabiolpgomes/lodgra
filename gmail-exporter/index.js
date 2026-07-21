const fs = require("node:fs/promises");
const path = require("node:path");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const OUTPUT_PATH = path.join(__dirname, "emails.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
];

const SEARCH_QUERY =
  "newer_than:3m (from:(airbnb.com) OR from:(booking.com))";

const MAX_EMAILS = 50;

function decodeBase64Url(data = "") {
  if (!data) return "";

  const normalized = data
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Buffer.from(normalized, "base64").toString("utf8");
}

function getHeader(headers = [], name) {
  return (
    headers.find(
      (header) =>
        header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? null
  );
}

function htmlToText(html = "") {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBodies(payload) {
  const result = {
    text: "",
    html: "",
    attachments: [],
  };

  function visit(part) {
    if (!part) return;

    const mimeType = part.mimeType ?? "";
    const filename = part.filename ?? "";
    const bodyData = part.body?.data;

    if (filename) {
      result.attachments.push({
        filename,
        mime_type: mimeType,
        attachment_id: part.body?.attachmentId ?? null,
        size_bytes: part.body?.size ?? null,
      });
    }

    if (bodyData && mimeType === "text/plain") {
      const decoded = decodeBase64Url(bodyData);

      if (decoded.length > result.text.length) {
        result.text = decoded;
      }
    }

    if (bodyData && mimeType === "text/html") {
      const decoded = decodeBase64Url(bodyData);

      if (decoded.length > result.html.length) {
        result.html = decoded;
      }
    }

    for (const child of part.parts ?? []) {
      visit(child);
    }
  }

  visit(payload);

  if (!result.text && result.html) {
    result.text = htmlToText(result.html);
  }

  return result;
}

function detectPlatform(sender = "", subject = "") {
  const value = `${sender} ${subject}`.toLowerCase();

  if (value.includes("airbnb")) return "airbnb";
  if (value.includes("booking.com")) return "booking";

  return "unknown";
}

function classifyEmail(subject = "") {
  const value = subject.toLowerCase();

  if (
    value.includes("nova reserva") ||
    value.includes("reserva confirmada")
  ) {
    return "reservation_confirmed";
  }

  if (value.includes("cancel")) {
    return "reservation_cancelled";
  }

  if (
    value.includes("pagamento") ||
    value.includes("payout")
  ) {
    return "payout";
  }

  if (
    value.includes("mensagem") ||
    value.startsWith("re:")
  ) {
    return "guest_message";
  }

  if (
    value.includes("avaliação") ||
    value.includes("comentário") ||
    value.includes("review")
  ) {
    return "review";
  }

  if (
    value.includes("consulta") ||
    value.includes("pedido de reserva")
  ) {
    return "inquiry";
  }

  if (
    value.includes("invoice") ||
    value.includes("fatura")
  ) {
    return "invoice";
  }

  return "other";
}

async function authorize() {
  return authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
}

async function listMessages(gmail) {
  const response = await gmail.users.messages.list({
    userId: "me",
    q: SEARCH_QUERY,
    maxResults: MAX_EMAILS,
    includeSpamTrash: false,
  });

  return response.data.messages ?? [];
}

async function readMessage(gmail, messageId) {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const message = response.data;
  const payload = message.payload ?? {};
  const headers = payload.headers ?? [];
  const bodies = extractBodies(payload);

  const subject = getHeader(headers, "Subject") ?? "";
  const sender = getHeader(headers, "From") ?? "";

  return {
    gmail_message_id: message.id,
    gmail_thread_id: message.threadId,
    platform: detectPlatform(sender, subject),
    email_type_hint: classifyEmail(subject),

    subject,
    from: sender,
    to: getHeader(headers, "To"),
    cc: getHeader(headers, "Cc"),
    reply_to: getHeader(headers, "Reply-To"),
    date_header: getHeader(headers, "Date"),

    received_at: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : null,

    snippet: message.snippet ?? "",
    body_text: bodies.text,
    body_html: bodies.html,
    attachments: bodies.attachments,
    labels: message.labelIds ?? [],
    size_estimate_bytes: message.sizeEstimate ?? null,
  };
}

async function main() {
  console.log("Autenticando no Gmail...");

  const auth = await authorize();

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  console.log("Buscando os últimos 50 e-mails...");

  const messages = await listMessages(gmail);

  if (messages.length === 0) {
    console.log("Nenhum e-mail encontrado.");
    return;
  }

  const emails = [];

  for (const [index, message] of messages.entries()) {
    if (!message.id) continue;

    console.log(
      `Lendo e-mail ${index + 1}/${messages.length}...`
    );

    try {
      const email = await readMessage(gmail, message.id);
      emails.push(email);
    } catch (error) {
      emails.push({
        gmail_message_id: message.id,
        export_status: "error",
        error: error.message,
      });
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 150)
    );
  }

  const output = {
    metadata: {
      source: "gmail_api",
      exported_at: new Date().toISOString(),
      query: SEARCH_QUERY,
      requested_limit: MAX_EMAILS,
      exported_count: emails.length,
      contains_personal_data: true,
    },
    emails,
  };

  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("");
  console.log("Exportação concluída.");
  console.log(`${emails.length} e-mails exportados.`);
  console.log(`Arquivo criado: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Erro durante a exportação:");
  console.error(error);
  process.exitCode = 1;
});