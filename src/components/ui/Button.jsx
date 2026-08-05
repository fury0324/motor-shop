const VARIANTS = {
  primary: 'bg-brand-red text-white hover:bg-brand-red-dark shadow-sm shadow-brand-red/20',
  dark: 'bg-brand-navy text-white hover:bg-brand-navy/90',
  outline: 'border border-brand-navy/15 text-brand-navy hover:border-brand-red hover:text-brand-red bg-white',
  ghost: 'text-brand-navy hover:bg-brand-navy/5',
}

function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
