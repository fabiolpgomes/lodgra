'use client'

import React from 'react'
import { Input, InputProps } from '@/design-system/atoms/Input'
import { Button, ButtonProps } from '@/design-system/atoms/Button'
import { Search } from 'lucide-react'

export interface SearchBoxProps {
  inputProps: Omit<InputProps, 'className'>
  buttonProps?: Omit<ButtonProps, 'children'>
  icon?: React.ReactNode
  onSearch?: (value: string) => void
  showButton?: boolean
}

const SearchBox = React.forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ inputProps, buttonProps, icon = <Search size={18} />, onSearch, showButton = true }, ref) => {
    const [value, setValue] = React.useState('')

    const handleSubmit = () => {
      if (onSearch) {
        onSearch(value)
      }
    }

    return (
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Input
            ref={ref}
            {...inputProps}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputProps.placeholder || 'Pesquisar...'}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lodgra-primary/40">
            {icon}
          </div>
        </div>
        {showButton && (
          <Button
            {...buttonProps}
            onClick={handleSubmit}
            size="md"
            variant={buttonProps?.variant || 'primary'}
          >
            Buscar
          </Button>
        )}
      </div>
    )
  }
)

SearchBox.displayName = 'SearchBox'

export { SearchBox }
