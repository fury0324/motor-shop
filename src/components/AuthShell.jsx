import logo from '../assets/euro-logo.png'
import Eyebrow from './ui/Eyebrow'

function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-white font-['Inter'] flex">
      {/* Hero panel — hidden below lg, this is the brand moment */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-brand-navy overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl" />
        <div className="absolute -left-24 bottom-0 w-80 h-80 bg-brand-red/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <img src={logo} alt="Euro Motor" className="h-10 w-auto object-contain" />
        </div>

        <div className="relative z-10 space-y-6">
          <Eyebrow>Dealership Management Platform</Eyebrow>
          <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
            Precision Operations<br />for <span className="italic text-brand-red">European Excellence.</span>
          </h1>
          <p className="text-sm text-white/60 max-w-sm">
            Inventory, sales, and customer records built to match the standard of the machines you sell.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 pt-6 border-t border-white/10">
          <div>
            <p className="text-2xl font-black text-white">20+</p>
            <p className="text-[10px] uppercase tracking-wide text-white/50">Years Experience</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-2xl font-black text-white">100%</p>
            <p className="text-[10px] uppercase tracking-wide text-white/50">Data Integrity</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-brand-offwhite lg:bg-white">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="Euro Motor" className="h-10 w-auto object-contain" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthShell
