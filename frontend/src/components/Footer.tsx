export default function Footer() {
  return (
    <footer id="contact" className="mt-0 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Landings</h4>
          <ul className="mt-5 space-y-3 text-sm text-slate-300">
            <li><a href="#" className="hover:text-white">Homepage</a></li>
            <li><a href="#about" className="hover:text-white">About us</a></li>
            <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
            <li><a href="#contact" className="hover:text-white">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Pages</h4>
          <ul className="mt-5 space-y-3 text-sm text-slate-300">
            <li><a href="#insights" className="hover:text-white">Blog</a></li>
            <li><a href="#insights" className="hover:text-white">Blog Details</a></li>
            <li><a href="#careers" className="hover:text-white">Careers</a></li>
            <li><a href="#careers" className="hover:text-white">Careers Details</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Reference</h4>
          <ul className="mt-5 space-y-3 text-sm text-slate-300">
            <li><a href="#" className="hover:text-white">404</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Newsletter</h4>
          <p className="mt-5 text-sm leading-relaxed text-slate-400">
            Stay updated with industry insights, product updates, and exclusive tips.
          </p>
          <div className="mt-5 flex gap-2">
            {['in', 'X', 'f', '◎'].map((icon) => (
              <a
                key={icon}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold hover:bg-slate-700"
              >
                {icon}
              </a>
            ))}
          </div>
          <form className="mt-5 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
              aria-label="Email"
            />
            <button
              type="submit"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500 hover:bg-brand-400"
              aria-label="Subscribe"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
      <p className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        © 2026 GSTMatch AI — Inspired by Flowfin layout
      </p>
    </footer>
  )
}
