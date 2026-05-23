const bars = [45, 55, 70, 95]

type Props = { embedded?: boolean }

export default function Preview({ embedded = false }: Props) {
  return (
    <section className={embedded ? 'relative -mb-8 mt-10 md:mt-14' : 'bg-white pb-20'}>
      <div className={`mx-auto ${embedded ? 'max-w-6xl px-4 sm:px-6' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
        <div
          className={`relative overflow-hidden shadow-2xl ${
            embedded ? 'min-h-[380px] rounded-[2rem] md:min-h-[480px]' : 'min-h-[420px] rounded-3xl md:min-h-[520px]'
          }`}
        >
          <div className="preview-photo absolute inset-0" role="img" aria-label="Finance team collaborating" />
          <div
            className="absolute left-0 top-0 h-28 w-28 bg-brand-500/25"
            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
            aria-hidden
          />
          <div
            className="absolute right-0 top-0 h-28 w-28 bg-brand-500/25"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
            aria-hidden
          />

          <div className="absolute left-4 top-6 z-10 flex max-w-md items-center gap-3 rounded-2xl bg-white p-3 shadow-lg sm:left-8 sm:top-10">
            <span className="flex -space-x-2" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="h-7 w-7 rounded-full border-2 border-white bg-brand-400" />
              ))}
            </span>
            <span className="rounded-xl bg-brand-100 px-3 py-2 text-xs font-medium text-brand-900 sm:text-sm">
              AI matched <strong>450 invoices</strong> in the last hour
            </span>
          </div>

          <div className="absolute bottom-6 left-4 z-10 w-[min(100%,340px)] rounded-2xl bg-white p-5 shadow-xl sm:bottom-10 sm:left-8">
            <div className="mb-4 flex gap-2 text-xs">
              {['Matched', 'Mismatched', 'Pending'].map((tab, i) => (
                <span
                  key={tab}
                  className={`rounded-full px-3 py-1.5 ${i === 0 ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-500'}`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">7,973</span>
              <span className="text-sm font-semibold text-brand-600">↑ 2,162</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Invoice matching increased this month by around 63%</p>
            <div className="mt-4 flex h-24 items-end justify-between gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-lg ${i === 3 ? 'bg-gradient-to-t from-brand-600 to-brand-400' : 'bg-brand-200'}`}
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[10px] text-slate-400">{['Jan', 'Feb', 'Mar', 'Apr'][i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute right-4 top-[28%] z-10 w-52 rounded-2xl bg-white p-5 shadow-xl sm:right-10">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <p className="font-bold text-slate-900">ITC Recovered</p>
            <p className="text-xs text-slate-500">Total tax credit recovered</p>
            <p className="mt-2 text-2xl font-bold">₹37.35L</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>82%</span>
              <span>₹23K pending</span>
            </div>
          </div>
        </div>
      </div>
      {!embedded && <div className="h-8" />}
    </section>
  )
}
