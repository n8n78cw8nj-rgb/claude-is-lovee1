import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2, type LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';

type Variant = 'gold' | 'ghost' | 'outline' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  gold:
    'text-bg font-semibold bg-gradient-to-br from-[#E6C893] via-gold-light to-gold shadow-gold hover:brightness-110',
  ghost: 'text-white hover:bg-white/5',
  outline: 'text-white border border-line hover:border-gold/70 hover:text-gold-light bg-card/40',
  danger: 'text-white bg-danger/90 hover:bg-danger shadow-[0_10px_30px_-10px_rgba(224,82,82,0.6)]',
  subtle: 'text-muted hover:text-white bg-field/60 hover:bg-field',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-7 text-base gap-2.5 rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'outline', size = 'md', icon: Icon, loading, children, className = '', disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={disabled || loading ? undefined : { scale: 1.03 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-[1.1em] w-[1.1em] shrink-0" /> : null}
      {children}
    </motion.button>
  );
});

export function IconButton({
  icon: Icon,
  label,
  className = '',
  ...rest
}: { icon: LucideIcon; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white ${className}`}
      {...rest}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
