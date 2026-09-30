import { forwardRef, useId } from 'react';

interface FieldProps {
  label?: string;
  hint?: React.ReactNode;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, FieldProps & React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ label, hint, className = '', id, ...rest }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <div className={className}>
        {label && (
          <label htmlFor={fid} className="label">
            {label}
          </label>
        )}
        <input ref={ref} id={fid} className="field" {...rest} />
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </div>
    );
  },
);

export function Textarea({
  label,
  hint,
  className = '',
  id,
  maxLength,
  value,
  ...rest
}: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fid} className="label flex justify-between">
          <span>{label}</span>
          {maxLength && (
            <span className={len >= maxLength ? 'text-danger' : 'text-muted/60'}>
              {len}/{maxLength}
            </span>
          )}
        </label>
      )}
      <textarea id={fid} className="field min-h-[96px] resize-y leading-relaxed" maxLength={maxLength} value={value} {...rest} />
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-3 text-sm text-muted">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-gold' : 'bg-field'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
      {label}
    </label>
  );
}
