/**
 * Script para exportar e-mails de Airbnb e Booking do Gmail como JSON
 *
 * Requisitos:
 * 1. npm install googleapis google-auth-library
 * 2. Criar Google Cloud project e OAuth credentials
 * 3. Salvar credentials.json na pasta scripts/
 */

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = 'token.json';

// Autorizar cliente Gmail
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync('scripts/credentials.json'));
  const config = credentials.installed || credentials.web;
  if (!config) {
    throw new Error('credentials.json inválido - precisa ter "installed" ou "web"');
  }
  const { client_id, client_secret, redirect_uris } = config;
  const redirectUri = Array.isArray(redirect_uris) ? redirect_uris[0] : 'http://localhost:3000';
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  if (fs.existsSync(TOKEN_PATH)) {
    oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oauth2Client;
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Abra este link para autorizar:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Cole o código de autorização: ', async (code) => {
      rl.close();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      resolve(oauth2Client);
    });
  });
}

// Buscar e-mails de Airbnb e Booking
async function getEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  // Buscar e-mails de Airbnb e Booking
  const queries = [
    'from:noreply@airbnb.com',
    'from:noreply@booking.com',
    'from:reservations@airbnb.com',
    'from:customer.service@booking.com',
  ];

  const emails = [];

  for (const query of queries) {
    try {
      console.log(`\nBuscando e-mails com: ${query}...`);

      const { data: messages } = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20,
      });

      if (!messages.messages) {
        console.log(`Nenhum e-mail encontrado para: ${query}`);
        continue;
      }

      for (const message of messages.messages) {
        try {
          const { data: fullMessage } = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });

          const headers = fullMessage.payload.headers;
          const emailData = {
            id: message.id,
            from: headers.find((h) => h.name === 'From')?.value || '',
            to: headers.find((h) => h.name === 'To')?.value || '',
            subject: headers.find((h) => h.name === 'Subject')?.value || '',
            date: headers.find((h) => h.name === 'Date')?.value || '',
            body: extractBody(fullMessage.payload),
          };

          emails.push(emailData);
          console.log(`  ✓ ${emailData.subject}`);
        } catch (error) {
          console.error(`  ✗ Erro ao processar e-mail ${message.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar e-mails para ${query}:`, error.message);
    }
  }

  return emails;
}

// Extrair corpo do e-mail (tenta HTML depois TEXT)
function extractBody(payload) {
  if (payload.parts) {
    // Tentar HTML primeiro (mais conteúdo)
    const htmlPart = payload.parts.find((part) => part.mimeType === 'text/html');
    if (htmlPart && htmlPart.body.data) {
      const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      // Remover tags HTML mantendo o texto
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    }

    // Fallback para plain text
    const textPart = payload.parts.find((part) => part.mimeType === 'text/plain');
    if (textPart && textPart.body.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  }

  // Tentar extrair direto do payload
  if (payload.body && payload.body.data) {
    const data = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    // Se for HTML, limpar tags
    if (payload.mimeType === 'text/html') {
      return data.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    }
    return data;
  }

  return '';
}

// Executar
async function main() {
  try {
    console.log('🔐 Autorizando com Gmail...');
    const auth = await authorize();

    console.log('📧 Buscando e-mails de Airbnb e Booking...');
    const emails = await getEmails(auth);

    if (emails.length === 0) {
      console.log('\n❌ Nenhum e-mail encontrado.');
      return;
    }

    // Salvar como JSON
    const filename = `gmail-emails-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(emails, null, 2));

    console.log(`\n✅ ${emails.length} e-mails exportados para: ${filename}`);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
