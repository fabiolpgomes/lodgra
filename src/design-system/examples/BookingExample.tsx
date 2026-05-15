/**
 * Example: Booking Form using Molecules
 *
 * This demonstrates Phase 4 - Composition of atoms into molecules:
 * - FormField (Label + Input)
 * - Card (Container)
 * - Button (Action)
 */

'use client'

import React, { useState } from 'react'
import { FormField } from '@/design-system/molecules/FormField'
import { Card } from '@/design-system/molecules/Card'
import { Button } from '@/design-system/atoms/Button'

interface BookingFormData {
  service: string
  date: string
  time: string
  client: string
  phone: string
  address: string
}

export function BookingExample() {
  const [formData, setFormData] = useState<BookingFormData>({
    service: '',
    date: '',
    time: '',
    client: '',
    phone: '',
    address: '',
  })

  const [errors, setErrors] = useState<Partial<BookingFormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<BookingFormData> = {}

    if (!formData.service) newErrors.service = 'Serviço é obrigatório'
    if (!formData.date) newErrors.date = 'Data é obrigatória'
    if (!formData.time) newErrors.time = 'Horário é obrigatório'
    if (!formData.client) newErrors.client = 'Nome do cliente é obrigatório'
    if (!formData.phone) newErrors.phone = 'Telefone é obrigatório'
    if (!formData.address) newErrors.address = 'Endereço é obrigatório'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      console.log('Form submitted:', formData)
      // Send to API
    }
  }

  return (
    <Card
      title="Agendar Limpeza"
      subtitle="Preencha os detalhes do serviço"
      padding="lg"
      variant="elevated"
      footer={
        <div className="flex gap-3">
          <Button className="flex-1" onClick={handleSubmit}>
            Confirmar Agendamento
          </Button>
          <Button variant="ghost" className="flex-1">
            Cancelar
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Service Selection */}
        <FormField
          label="Tipo de Serviço"
          inputProps={{
            placeholder: 'Selecione o serviço desejado',
            value: formData.service,
            onChange: (e) => setFormData({ ...formData, service: e.target.value }),
          }}
          error={!!errors.service}
          errorMessage={errors.service}
        />

        {/* Date Selection */}
        <FormField
          label="Data do Serviço"
          inputProps={{
            type: 'date',
            value: formData.date,
            onChange: (e) => setFormData({ ...formData, date: e.target.value }),
            min: new Date().toISOString().split('T')[0], // Prevent past dates
          }}
          error={!!errors.date}
          errorMessage={errors.date}
          helperText="Selecione uma data futura"
        />

        {/* Time Selection */}
        <FormField
          label="Horário Preferido"
          inputProps={{
            type: 'time',
            value: formData.time,
            onChange: (e) => setFormData({ ...formData, time: e.target.value }),
          }}
          error={!!errors.time}
          errorMessage={errors.time}
          helperText="Horários disponíveis: 08:00 - 18:00"
        />

        {/* Client Information */}
        <FormField
          label="Nome do Cliente"
          inputProps={{
            placeholder: 'Seu nome completo',
            value: formData.client,
            onChange: (e) => setFormData({ ...formData, client: e.target.value }),
          }}
          error={!!errors.client}
          errorMessage={errors.client}
        />

        {/* Phone Contact */}
        <FormField
          label="Telefone para Contato"
          inputProps={{
            type: 'tel',
            placeholder: '(11) 99999-9999',
            value: formData.phone,
            onChange: (e) => setFormData({ ...formData, phone: e.target.value }),
          }}
          error={!!errors.phone}
          errorMessage={errors.phone}
          helperText="Com DDD"
        />

        {/* Address Information */}
        <FormField
          label="Endereço do Serviço"
          inputProps={{
            placeholder: 'Rua, número, bairro, cidade',
            value: formData.address,
            onChange: (e) => setFormData({ ...formData, address: e.target.value }),
          }}
          error={!!errors.address}
          errorMessage={errors.address}
          helperText="Completo com CEP"
        />
      </form>
    </Card>
  )
}

export default BookingExample
