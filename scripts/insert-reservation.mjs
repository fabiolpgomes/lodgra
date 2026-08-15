import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://brjumbfpvijrkhrherpt.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyanVtYmZwdmlqcmtocmhlcnB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA0ODY4OSwiZXhwIjoyMDgzNjI0Njg5fQ.BhCE3-QhkUvmiNEppS2OS_U_j2vdHqM9rkfZj2kUwpo';

async function insertReservation() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Buscar propriedade
    console.log('🔍 Procurando propriedade "AHS Premium apart"...');
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name')
      .ilike('name', '%AHS Premium apart%')
      .single();

    if (propertyError) {
      console.error('❌ Erro ao buscar propriedade:', propertyError.message);
      return;
    }

    if (!property) {
      console.error('❌ Propriedade "AHS Premium apart" não encontrada');
      return;
    }

    console.log(`✅ Propriedade encontrada: ${property.name} (ID: ${property.id})`);

    // Preparar dados da reserva (number_of_nights é calculado automaticamente)
    const reservationData = {
      organization_id: '00000000-0000-0000-0000-000000000001',
      property_id: property.id,
      guest_name: 'Laura Feghaly',
      guest_email: 'laura@email.com',
      number_of_guests: 1,
      check_in: '2026-05-29',
      check_out: '2026-06-26',
      total_price: 1290,
      currency: 'EUR',
      booking_source: 'Flatio',
      status: 'confirmed',
      notes: 'Reserva inserida via script administrativo',
    };

    console.log('\n📝 Dados da reserva:');
    console.log(JSON.stringify(reservationData, null, 2));

    // Inserir reserva
    console.log('\n⏳ Inserindo reserva...');
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir reserva:', insertError.message);
      return;
    }

    console.log('\n✅ Reserva criada com sucesso!');
    console.log(`ID da reserva: ${reservation.id}`);
    console.log(`Hóspede: ${reservation.guest_name}`);
    console.log(`Email: ${reservation.guest_email}`);
    console.log(`Check-in: ${reservation.check_in}`);
    console.log(`Check-out: ${reservation.check_out}`);
    console.log(`Número de noites: ${reservation.number_of_nights}`);
    console.log(`Valor total: ${reservation.currency} ${reservation.total_price}`);
    console.log(`Plataforma: ${reservation.booking_source}`);
    console.log(`Status: ${reservation.status}`);
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

insertReservation();
