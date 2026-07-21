const path = require("node:path");
const process = require("node:process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
];

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "credentials.json"
);

async function testGmailLogin() {
  console.log("Abrindo autenticação do Google...");

  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  console.log("Autenticação concluída.");

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const response = await gmail.users.labels.list({
    userId: "me",
  });

  console.log("Conexão com o Gmail concluída.");
  console.log(
    `Total de marcadores encontrados: ${
      response.data.labels?.length ?? 0
    }`
  );
}

testGmailLogin().catch((error) => {
  console.error("Falha:", error.message);
  process.exitCode = 1;
});