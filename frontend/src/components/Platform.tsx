import { bentoCards } from '../data/content'
import SectionTitle from './SectionTitle'

const rows = [
  { vendor: 'Tata Sons Pvt Ltd', status: 'Matched', value: '₹4,56,000', risk: '12', date: '09 Dec 2024', tone: 'ok' as const },
  { vendor: 'Reliance Retail', status: 'Mismatch', value: '₹2,10,500', risk: '78', date: '08 Dec 2024', tone: 'warn' as const },
  { vendor: 'Infosys BPO', status: 'Pending', value: '₹89,200', risk: '34', date: '07 Dec 2024', tone: 'pending' as const },
]

const statusClass = {
  ok: 'bg-brand-100 text-brand-800',
  warn: 'bg-amber-100 text-amber-800',
  pending: 'bg-slate-100 text-slate-700',
}

export default function Platform() {
  return (
    <section id="platform" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle title="All Your GST Tools In One Place" />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bentoCards.map((c) => (
            <div key={c.title} className="bento-tile">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white text-sm">
                ◆
              </span>
              <h3 className="mt-4 font-bold text-slate-900">{c.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="flex">
            <aside className="hidden w-16 flex-shrink-0 flex-col items-center gap-5 border-r border-slate-100 bg-slate-50 py-8 sm:flex">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className={`h-9 w-9 rounded-xl ${i === 1 ? 'bg-brand-600' : 'bg-slate-200'}`} />
              ))}
            </aside>
            <div className="min-w-0 flex-1 p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <span className="text-sm text-slate-500">Dashboard / Reconciliation</span>
                <span className="rounded-xl bg-slate-100 px-4 py-2 text-xs text-slate-500">Search invoices… ⌘K</span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-9 w-9 rounded-full bg-brand-300" />
                  Finance Team
                </span>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-4 pr-4">Vendor</th>
                      <th className="pb-4 pr-4">Status</th>
                      <th className="pb-4 pr-4">Invoice Value</th>
                      <th className="pb-4 pr-4">Risk Score</th>
                      <th className="pb-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.vendor} className="border-b border-slate-50">
                        <td className="py-4 pr-4 font-medium">{r.vendor}</td>
                        <td className="py-4 pr-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[r.tone]}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-slate-600">{r.value}</td>
                        <td className="py-4 pr-4 font-medium">{r.risk}</td>
                        <td className="py-4 text-slate-500">{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
