import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import Pagination from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    currentPage: {
      control: { type: 'number', min: 1 },
      description: 'Current active page',
    },
    totalPages: {
      control: { type: 'number', min: 1 },
      description: 'Total number of pages',
    },
    showPageNumbers: {
      control: 'boolean',
      description: 'Show page number buttons',
    },
    maxPageButtons: {
      control: { type: 'number', min: 3, max: 10 },
      description: 'Maximum page buttons to show',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable all pagination controls',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: fn(),
  },
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    onPageChange: fn(),
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
    onPageChange: fn(),
  },
};

export const FewPages: Story = {
  args: {
    currentPage: 2,
    totalPages: 3,
    onPageChange: fn(),
  },
};

export const ManyPages: Story = {
  args: {
    currentPage: 25,
    totalPages: 100,
    onPageChange: fn(),
  },
};

export const WithoutPageNumbers: Story = {
  args: {
    currentPage: 5,
    totalPages: 20,
    onPageChange: fn(),
    showPageNumbers: false,
  },
};

export const Disabled: Story = {
  args: {
    currentPage: 3,
    totalPages: 10,
    onPageChange: fn(),
    disabled: true,
  },
};

const InteractivePaginationComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 15;

  return (
    <div className="space-y-4">
      <div className="text-center text-gray-600">
        صفحه {currentPage} از {totalPages}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      <div className="text-center text-sm text-gray-500">
        روی دکمه‌ها کلیک کنید تا صفحه تغییر کند
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractivePaginationComponent />,
};

export const CustomMaxButtons: Story = {
  args: {
    currentPage: 10,
    totalPages: 50,
    onPageChange: fn(),
    maxPageButtons: 3,
  },
};
