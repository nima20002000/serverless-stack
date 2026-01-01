'use client';

import { ReactNode } from 'react';
import ModalV4 from '../ui-v4/Modal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
}: ModalProps) {
  const sizeMap = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    '2xl': 'full',
  } as const;

  return (
    <ModalV4
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={sizeMap[size]}
    >
      {children}
    </ModalV4>
  );
}
