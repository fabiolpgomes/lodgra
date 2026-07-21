/**
 * Script para importar e-mails do JSON para raw_emails
 * e rodar o job de extração
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importEmails() {
  try {
    console.log('📥 Lendo arquivo de e-mails...');
    const data = JSON.parse(fs.readFileSync('/Users/fabiogomes/Projetos/lodgra/gmail-exporter/emails.json', 'utf-8'));

    const emails = data.emails;
    console.log(`✅ Encontrados ${emails.length} e-mails`);

    const imported = [];
    const errors = [];

    for (const email of emails) {
      try {
        // Construir conteúdo raw (subject + body)
        const rawContent = `Subject: ${email.subject}\n\nFrom: ${email.from}\nTo: ${email.to}\nDate: ${email.date_header}\n\n${email.snippet || email.body || ''}`;

        // Inserir em raw_emails
        const { data: inserted, error } = await supabase
          .from('raw_emails')
          .insert({
            organization_id: '00000000-0000-0000-0000-000000000001',
            provider: 'gmail_import',
            provider_message_id: email.gmail_message_id,
            recipient: email.to,
            sender: email.from,
            subject: email.subject,
            received_at: email.received_at,
            raw_content: rawContent,
            processing_status: 'pending',
          })
          .select()

        if (error) {
          // Ignorar duplicatas
          if (error.code === '23505') {
            console.log(`  ⚠️  Duplicado: ${email.gmail_message_id}`);
          } else {
            errors.push({ email: email.subject, error: error.message });
          }
        } else {
          imported.push(email.subject);
          console.log(`  ✓ Importado: ${email.subject.substring(0, 50)}...`);
        }
      } catch (error) {
        errors.push({ email: email.subject, error: error.message });
      }
    }

    console.log(`\n✅ Importados: ${imported.length}`);
    if (errors.length > 0) {
      console.log(`❌ Erros: ${errors.length}`);
      console.log(errors.slice(0, 3));
    }

    // Verificar quantos pendentes temos
    const { count } = await supabase
      .from('raw_emails')
      .select('*', { count: 'exact', head: true })
      .eq('processing_status', 'pending')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001')

    console.log(`\n📊 Total pendentes: ${count}`);
    console.log('\n🚀 Próximo passo: rodar job de extração');
    console.log('   curl -X POST https://lodgra.vercel.app/api/email-extraction/process-pending');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

importEmails();
