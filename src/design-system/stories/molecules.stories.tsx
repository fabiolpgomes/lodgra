import type { Meta, StoryObj } from '@storybook/react'
import { FormField } from '@/design-system/molecules/FormField'
import { SearchBox } from '@/design-system/molecules/SearchBox'
import { Card } from '@/design-system/molecules/Card'
import { Button } from '@/design-system/atoms/Button'

// FormField Stories
const FormFieldMeta = {
  title: 'Molecules/FormField',
  component: FormField,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof FormField>

export default FormFieldMeta
type FormFieldStory = StoryObj<typeof FormFieldMeta>

export const Basic: FormFieldStory = {
  args: {
    label: 'Email',
    inputProps: { placeholder: 'your@email.com', type: 'email' },
  },
}

export const WithError: FormFieldStory = {
  args: {
    label: 'Username',
    inputProps: { placeholder: 'username' },
    error: true,
    errorMessage: 'Username is required',
  },
}

export const WithHelper: FormFieldStory = {
  args: {
    label: 'Password',
    inputProps: { type: 'password' },
    helperText: 'Min 8 characters',
  },
}

export const Optional: FormFieldStory = {
  args: {
    label: 'Phone',
    inputProps: { type: 'tel' },
    required: false,
  },
}

// SearchBox Stories
const _SearchBoxMeta = {
  title: 'Molecules/SearchBox',
  component: SearchBox,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof SearchBox>

export const SearchBoxBasic: StoryObj<typeof _SearchBoxMeta> = {
  args: {
    inputProps: { placeholder: 'Search...' },
  },
}

export const SearchBoxWithHandler: StoryObj<typeof _SearchBoxMeta> = {
  args: {
    inputProps: { placeholder: 'Search services...' },
    onSearch: (value) => console.log('Search:', value),
  },
}

export const SearchBoxNoButton: StoryObj<typeof _SearchBoxMeta> = {
  args: {
    inputProps: { placeholder: 'Live search...' },
    showButton: false,
  },
}

// Card Stories
const _CardMeta = {
  title: 'Molecules/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export const CardBasic: StoryObj<typeof _CardMeta> = {
  args: {
    title: 'Card Title',
    children: <p>Card content goes here</p>,
  },
}

export const CardWithSubtitle: StoryObj<typeof _CardMeta> = {
  args: {
    title: 'Service',
    subtitle: 'Premium Cleaning',
    children: <p>Professional cleaning service with 5-star ratings</p>,
  },
}

export const CardWithFooter: StoryObj<typeof _CardMeta> = {
  args: {
    title: 'Action Card',
    children: <p>This card has an action footer</p>,
    footer: <Button size="sm">Learn More</Button>,
  },
}

export const CardElevated: StoryObj<typeof _CardMeta> = {
  args: {
    title: 'Elevated Card',
    variant: 'elevated',
    children: <p>This card has elevation</p>,
  },
}

export const CardOutlined: StoryObj<typeof _CardMeta> = {
  args: {
    title: 'Outlined Card',
    variant: 'outlined',
    children: <p>This card has an outlined style</p>,
  },
}

export const CardComplex: StoryObj<typeof _CardMeta> = {
  args: {
    title: 'Booking Card',
    subtitle: 'Schedule your service',
    variant: 'elevated',
    padding: 'lg',
    footer: (
      <div className="flex gap-2">
        <Button className="flex-1" size="sm">
          Book Now
        </Button>
        <Button variant="ghost" className="flex-1" size="sm">
          Learn More
        </Button>
      </div>
    ),
    children: (
      <div className="space-y-2">
        <p className="text-design-sm">⭐ 4.9 (128 reviews)</p>
        <p className="text-design-xs text-lodgra-primary/60">Professional cleaning service with guaranteed satisfaction</p>
      </div>
    ),
  },
}
