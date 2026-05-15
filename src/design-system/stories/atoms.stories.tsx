import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/design-system/atoms/Button'
import { Input } from '@/design-system/atoms/Input'
import { Label as _Label } from '@/design-system/atoms/Label'

// Button Stories
const ButtonMeta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default ButtonMeta
type ButtonStory = StoryObj<typeof ButtonMeta>

export const Primary: ButtonStory = {
  args: { variant: 'primary', size: 'md', children: 'Click me' },
}

export const Secondary: ButtonStory = {
  args: { variant: 'secondary', size: 'md', children: 'Save' },
}

export const Ghost: ButtonStory = {
  args: { variant: 'ghost', size: 'md', children: 'Cancel' },
}

export const Danger: ButtonStory = {
  args: { variant: 'danger', size: 'md', children: 'Delete' },
}

export const AllSizes: ButtonStory = {
  render: () => (
    <div className="flex gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const Loading: ButtonStory = {
  args: { isLoading: true, children: 'Processing...' },
}

export const Disabled: ButtonStory = {
  args: { disabled: true, children: 'Disabled' },
}

// Input Stories
const _InputMeta = {
  title: 'Atoms/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Input>

export const InputPrimary: StoryObj<typeof _InputMeta> = {
  args: { placeholder: 'Enter text', size: 'md' },
}

export const InputWithLabel: StoryObj<typeof _InputMeta> = {
  args: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
}

export const InputWithError: StoryObj<typeof _InputMeta> = {
  args: {
    label: 'Username',
    error: true,
    errorMessage: 'Username is already taken',
  },
}

export const InputWithHelper: StoryObj<typeof _InputMeta> = {
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Min 8 characters, 1 uppercase, 1 number',
  },
}

// Label Stories
const _LabelMeta = {
  title: 'Atoms/Label',
  component: Label,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>

export const LabelPrimary: StoryObj<typeof _LabelMeta> = {
  args: { htmlFor: 'field', children: 'Field Name' },
}

export const LabelOptional: StoryObj<typeof _LabelMeta> = {
  args: { htmlFor: 'phone', optional: true, children: 'Phone' },
}

export const LabelAllSizes: StoryObj<typeof _LabelMeta> = {
  render: () => (
    <div className="flex gap-4">
      <_Label size="sm">Small</_Label>
      <_Label size="md">Medium</_Label>
      <_Label size="lg">Large</_Label>
    </div>
  ),
}
