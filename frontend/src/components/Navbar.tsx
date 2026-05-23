import { useState, useEffect } from 'react'
import { navLinks } from '../data/content'
import Button from './Button'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-1' : 'py-3'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">GSTMATCH</span>
        </a>

        <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-slate-800 transition hover:text-brand-600"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button href="/dashboard" size="sm">
            Get Started Now
          </Button>
        </div>

        <button
          type="button"
          className="flex flex-col gap-1.5 p-2 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="h-0.5 w-6 bg-slate-900" />
          <span className="h-0.5 w-6 bg-slate-900" />
          <span className="h-0.5 w-6 bg-slate-900" />
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/50 bg-white/95 px-4 py-4 backdrop-blur md:hidden">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block py-2.5 text-sm font-medium text-slate-800"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="mt-4">
            <Button href="/dashboard" size="sm">
              Get Started Now
            </Button>
          </div>
        </nav>
      )}
    </header>
  )
}
