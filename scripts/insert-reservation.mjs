import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

async function insertReservation() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Buscar propriedade
    console.log('🔍 Procurando propriedade "AHS T1 Portimão"...');
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name')
      .ilike('name', '%T1 Portim%')
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
      guest_name: 'Domingos Bento',
      guest_email: 'domingos@email.com',
      number_of_guests: 1,
      check_in: '2026-06-06',
      check_out: '2026-07-06',
      total_price: 720,
      currency: 'EUR',
      booking_source: 'Reserva Direta',
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
