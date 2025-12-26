import React from 'react';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

// --- Inputs ---
interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  prefix?: string;
  suffix?: string;
  error?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({ label, prefix, suffix, error, className, ...props }) => {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
      <div className={`
        relative flex items-center bg-zinc-950 rounded-xl border transition-colors duration-200
        ${error ? 'border-red-500/50 focus-within:border-red-500' : 'border-zinc-800 focus-within:border-brand-500'}
      `}>
        {prefix && <span className="pl-5 text-zinc-500 font-medium text-lg select-none">{prefix}</span>}
        <input 
          className="w-full bg-transparent text-white p-5 outline-none font-mono text-2xl placeholder-zinc-700"
          {...props}
        />
        {suffix && <span className="pr-5 text-zinc-600 text-lg select-none">{suffix}</span>}
      </div>
    </div>
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'neutral' }> = ({ children, variant = 'neutral' }) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    neutral: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  return (
    <span className={`px-3 py-1.5 rounded-md text-sm font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, className, ...props }) => {
  const baseStyle = "h-16 w-full rounded-xl text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200",
    secondary: "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700",
    ghost: "bg-transparent text-zinc-400 hover:text-white",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} disabled={isLoading} {...props}>
      {isLoading ? (
        <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      ) : children}
    </button>
  );
};

// --- Skeleton ---
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-md ${className}`} />
);

// --- Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {children}
      </div>
    </div>
  );
};