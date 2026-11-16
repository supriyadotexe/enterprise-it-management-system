const VARIANTS = {
  primary:
    'bg-blue-700 text-white shadow-sm hover:bg-blue-800 focus-visible:outline-blue-700 disabled:bg-blue-300',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-blue-700 disabled:text-slate-400',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600 disabled:bg-rose-300',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-blue-700 disabled:text-slate-400',
  link: 'text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline focus-visible:outline-blue-700',
};

const SIZES = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
