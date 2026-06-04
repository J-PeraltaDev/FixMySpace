export function HelpContactCard({ title, detail, action }: { title: string; detail: string; action: string }) {
  return (
    <article className="soft-card p-5">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">{action}</p>
    </article>
  );
}
