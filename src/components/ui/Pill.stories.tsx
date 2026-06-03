import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Pill from './Pill';

const meta: Meta<typeof Pill> = {
  title: 'Design System/Pill',
  component: Pill,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Pill>;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap justify-center gap-3">
      <Pill tone="neutral">Neutral</Pill>
      <Pill tone="primary">Primary</Pill>
      <Pill tone="success">Success</Pill>
      <Pill tone="warning">Warning</Pill>
      <Pill tone="danger">Danger</Pill>
    </div>
  ),
};
