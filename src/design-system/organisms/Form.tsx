'use client'

import React, { useState } from 'react'
import { FormField } from '@/design-system/molecules/FormField'
import { Button } from '@/design-system/atoms/Button'
import { Card } from '@/design-system/molecules/Card'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'tel' | 'date' | 'time' | 'textarea' | 'select'
  placeholder?: string
  required?: boolean
  options?: Array<{ label: string; value: string }> // For select
  helperText?: string
  pattern?: string
  validation?: (value: string) => string | undefined // Custom validator
}

export interface FormProps {
  title: string
  subtitle?: string
  fields: FormField[]
  onSubmit: (data: Record<string, string>) => Promise<void> | void
  submitLabel?: string
  cancelLabel?: string
  onCancel?: () => void
  isLoading?: boolean
}

export function Form({
  title,
  subtitle,
  fields,
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  isLoading = false,
}: FormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach((field) => {
      const value = formData[field.name]

      // Required validation
      if (field.required && !value.trim()) {
        newErrors[field.name] = `${field.label} is required`
        return
      }

      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Invalid email address'
          return
        }
      }

      // Pattern validation
      if (field.pattern && value) {
        const regex = new RegExp(field.pattern)
        if (!regex.test(value)) {
          newErrors[field.name] = `${field.label} format is invalid`
          return
        }
      }

      // Custom validation
      if (field.validation && value) {
        const error = field.validation(value)
        if (error) {
          newErrors[field.name] = error
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form on success
      setFormData(
        fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
      )
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card
      title={title}
      subtitle={subtitle}
      padding="lg"
      footer={
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={handleSubmit}
            isLoading={isSubmitting || isLoading}
            disabled={isSubmitting || isLoading}
          >
            {submitLabel}
          </Button>
          {onCancel && (
            <Button variant="ghost" className="flex-1" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fields.map((field) => {
          if (field.type === 'textarea') {
            return (
              <div key={field.name} className="flex flex-col gap-1">
                <label className="text-design-sm font-heading font-black text-be-text uppercase tracking-wider">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  name={field.name}
                  value={formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="block w-full px-3 py-2 border border-be-border/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-lodgra-primary/20"
                />
                {errors[field.name] && (
                  <p className="text-design-xs text-red-600 font-bold">{errors[field.name]}</p>
                )}
                {field.helperText && !errors[field.name] && (
                  <p className="text-design-xs text-be-text/40">{field.helperText}</p>
                )}
              </div>
            )
          }

          if (field.type === 'select') {
            return (
              <div key={field.name} className="flex flex-col gap-1">
                <label className="text-design-sm font-heading font-black text-be-text uppercase tracking-wider">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  name={field.name}
                  value={formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="block w-full px-3 py-2 border border-be-border/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-lodgra-primary/20"
                >
                  <option value="">{field.placeholder || 'Select an option'}</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors[field.name] && (
                  <p className="text-design-xs text-red-600 font-bold">{errors[field.name]}</p>
                )}
              </div>
            )
          }

          return (
            <FormField
              key={field.name}
              label={`${field.label}${field.required ? '' : ''}`}
              inputProps={{
                name: field.name,
                type: field.type,
                placeholder: field.placeholder,
                value: formData[field.name],
                onChange: (e) => handleChange(field.name, e.target.value),
              }}
              error={!!errors[field.name]}
              errorMessage={errors[field.name]}
              helperText={field.helperText}
              required={field.required}
            />
          )
        })}
      </form>
    </Card>
  )
}

Form.displayName = 'Form'
