import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PillV4 from './Pill';

const meta: Meta<typeof PillV4> = {
  title: 'Design System v4 (Girlish)/Pill',
  component: PillV4,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['rose', 'blush', 'peach', 'mint', 'cream'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PillV4>;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 justify-center">
      <PillV4 tone="rose">رز</PillV4>
      <PillV4 tone="blush">بلش</PillV4>
      <PillV4 tone="peach">هلویی</PillV4>
      <PillV4 tone="mint">نعنایی</PillV4>
      <PillV4 tone="cream">کرم</PillV4>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <PillV4
      tone="blush"
      icon={
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      }
    >
      علاقه‌مندی
    </PillV4>
  ),
};
