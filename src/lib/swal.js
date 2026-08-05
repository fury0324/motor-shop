import Swal from 'sweetalert2'

// Centralized, brand-themed SweetAlert2 instance. Every Swal.fire() in the
// app should import this instead of 'sweetalert2' directly, so popups share
// one consistent look (rounded, brand red/navy, Inter type) instead of each
// call site hand-tuning its own confirmButtonColor. buttonsStyling is off so
// these classes fully replace SweetAlert2's default button chrome — any
// confirmButtonColor/cancelButtonColor still passed by individual call sites
// is harmlessly ignored rather than fought over specificity.
const themedSwal = Swal.mixin({
  buttonsStyling: false,
  heightAuto: false,
  backdrop: 'rgba(11, 28, 48, 0.55)',
  customClass: {
    popup: "font-['Inter'] rounded-2xl shadow-2xl border border-black/5 px-2",
    title: 'text-brand-navy font-black tracking-tight text-xl',
    htmlContainer: 'text-[#595f66] text-sm',
    confirmButton:
      'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wide uppercase bg-brand-red text-white hover:bg-brand-red-dark transition-colors mx-1.5 shadow-sm shadow-brand-red/20',
    cancelButton:
      'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wide uppercase bg-white text-brand-navy border border-brand-navy/15 hover:border-brand-red hover:text-brand-red transition-colors mx-1.5',
    denyButton:
      'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wide uppercase bg-white text-brand-navy border border-brand-navy/15 hover:border-brand-red hover:text-brand-red transition-colors mx-1.5',
    actions: 'gap-0',
  },
})

export default themedSwal
