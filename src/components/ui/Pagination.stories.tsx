import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import Pagination from './Pagination';

const noop = () => {};

const meta: Meta<typeof Pagination> = {
  title: 'Design System/Pagination',
  component: Pagination,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: noop,
  },
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    onPageChange: noop,
  },
};

export const WithoutPageNumbers: Story = {
  args: {
    currentPage: 5,
    totalPages: 20,
    onPageChange: noop,
    showPageNumbers: false,
  },
};

const InteractivePaginationComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 15;

  return (
    <div className="space-y-4">
      <div className="text-center text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      <div className="text-center text-sm text-muted-foreground">
        Use the controls to change pages.
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractivePaginationComponent />,
};
