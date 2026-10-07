import Link from 'next/link';
import { type ReactNode } from 'react';

type Props = {
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

export function Button({
  href,
  variant = 'primary',
  children,
  className = '',
  onClick,
  type = 'button',
}: Props) {
  const cls = `btn btn-${variant} ${className}`.trim();
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
