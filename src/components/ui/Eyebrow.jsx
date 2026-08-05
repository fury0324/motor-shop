function Eyebrow({ children }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
      <span className="w-4 h-[2px] bg-brand-red" />
      {children}
    </div>
  )
}

export default Eyebrow
