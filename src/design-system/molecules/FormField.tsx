'use client'

import React from 'react'
import { Label, LabelProps } from '@/design-system/atoms/Label'
import { Input, InputProps } from '@/design-system/atoms/Input'

export interface FormFieldProps {
  label: string
  labelProps?: Omit<LabelProps, 'children'>
  inputProps: InputProps
  error?: boolean
  errorMessage?: string
  helperText?: string
  required?: boolean
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, labelProps, inputProps, error, errorMessage, helperText, required }, ref) => (
    <div className="flex flex-col gap-2">
      <Label {...labelProps} optional={required === false}>
        {label}
      </Label>
      <Input
        ref={ref}
        {...inputProps}
        error={error || !!errorMessage}
        errorMessage={errorMessage}
        helperText={helperText && !errorMessage ? helperText : undefined}
      />
    </div>
  )
)

FormField.displayName = 'FormField'

export { FormField }
