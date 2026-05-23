export default function Testimonial() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="rounded-[2rem] bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200 px-6 py-14 md:px-16 md:py-16">
          <blockquote className="text-xl font-semibold leading-snug text-slate-900 md:text-2xl lg:text-3xl">
            &ldquo;GSTMatch transformed our entire reconciliation operation. We can&apos;t imagine filing
            without it.&rdquo;
          </blockquote>
          <div className="mt-10 flex flex-col items-center gap-3">
            <span className="h-14 w-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
            <div>
              <p className="font-bold text-slate-900">Priya Sharma, CFO</p>
              <p className="text-sm text-slate-600">BaselStart Commerce Pvt Ltd</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
