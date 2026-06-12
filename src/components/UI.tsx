import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
  id?: string;
}

export const Card = ({ children, className, delay = 0, ...props }: CardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={cn(
      "bg-white border-2 border-[#F0F2F1] rounded-[2.5rem] p-5 shadow-sm transition-all",
      className
    )}
    {...props}
  >
    {children}
  </motion.div>
);

export const Button = ({ children, className, variant = 'primary', ...props }: HTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost', type?: 'button' | 'submit' | 'reset' }) => {
  const variants = {
    primary: 'bg-theme-teal text-white shadow-md hover:bg-[#6FA59D]',
    secondary: 'bg-white text-theme-teal border border-[#E0E7E5] hover:bg-slate-50',
    ghost: 'text-theme-muted hover:bg-slate-50'
  };

  return (
    <button
      className={cn(
        "px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, error, className, ...props }: HTMLAttributes<HTMLInputElement> & { label?: string, error?: string, type?: string, placeholder?: string, required?: boolean, value?: string, name?: string }) => (
  <div className="space-y-2 w-full">
    {label && <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">{label}</label>}
    <input
      className={cn(
        "w-full px-5 py-4 rounded-2xl bg-white border border-[#E0E7E5] shadow-sm focus:border-theme-teal focus:ring-4 focus:ring-theme-teal/10 transition-all outline-none",
        error && "border-red-400 ring-4 ring-red-100",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 ml-2">{error}</p>}
  </div>
);

