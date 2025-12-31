import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import StatCardV4 from './StatCard';

const meta: Meta<typeof StatCardV4> = {
  title: 'Design System v4 (Girlish)/StatCard',
  component: StatCardV4,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatCardV4>;

export const Dashboard: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 max-w-2xl">
      <StatCardV4
        label="سفارشات"
        value="۲۴۵"
        trend="+۱۲٪"
        accent="rose"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7h18M3 12h18M3 17h18"
            />
          </svg>
        }
      />
      <StatCardV4
        label="درآمد"
        value="۴۵.۶M"
        trend="+۸٪"
        accent="peach"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 1.343-3 3v7h6v-7c0-1.657-1.343-3-3-3zm0 0V6m0 0a3 3 0 00-3 3m3-3a3 3 0 013 3"
            />
          </svg>
        }
      />
      <StatCardV4
        label="اعضا"
        value="۱,۴۲۰"
        trend="+۲۳٪"
        accent="mint"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h1m6-4a4 4 0 10-8 0 4 4 0 008 0zm6 4a3 3 0 10-6 0 3 3 0 006 0z"
            />
          </svg>
        }
      />
      <StatCardV4
        label="بازگشت"
        value="۹۳٪"
        trend="+۳٪"
        accent="pink"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-14"
            />
          </svg>
        }
      />
    </div>
  ),
};
