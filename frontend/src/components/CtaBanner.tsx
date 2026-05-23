import Button from './Button'

export default function CtaBanner() {
  return (
    <section className="bg-white px-4 pb-0 pt-8 sm:px-6">
      <div
        id="cta"
        className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-br from-brand-100 via-brand-200 to-brand-300 px-6 py-16 text-center md:rounded-[2.5rem] md:px-16 md:py-20"
      >
        <h2 className="text-2xl font-extrabold uppercase leading-tight tracking-tight text-slate-900 sm:text-4xl">
          Complete GST Management Control
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-700">
          Take charge of every reconciliation process — from GSTR-2B matching to ITC recovery — using one
          integrated, intelligent platform.
        </p>
        <div className="mt-10 flex justify-center">
          <Button href="/dashboard">Get Started For Free</Button>
        </div>
      </div>
    </section>
  )
}
