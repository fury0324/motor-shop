const TONES = {
  red: 'bg-brand-red text-white',
  navy: 'bg-brand-navy text-white',
  outline: 'border border-brand-red/30 text-brand-red bg-red-50',
  gray: 'bg-[#eceef4] text-[#45464d]',
}

function Badge({ children, tone = 'red', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}

export default Badge
