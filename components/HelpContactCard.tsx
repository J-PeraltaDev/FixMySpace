export function HelpContactCard({ title, detail, action }: { title: string; detail: string; action: string }) {
  return (
    <article className="soft-card p-5">
      <h3 className="text-lg font-bold text-[#191c1b]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#414845]">{detail}</p>
      <p className="mt-4 rounded-lg bg-[#bfecdd] px-4 py-3 text-sm font-bold text-[#00261e]">{action}</p>
    </article>
  );
}
