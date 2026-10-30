export function AdminPageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div><p className="text-xs font-semibold text-[#8A929D]">{eyebrow}</p><h1 className="mt-2 text-[28px] font-bold tracking-[-.03em] text-[#171717]">{title}</h1><p className="mt-2 text-sm text-[#6B7280]">{description}</p></div>
    {children ? <div className="flex items-center gap-2">{children}</div> : null}
  </header>;
}

export function EmptyPanel({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8DDE3] bg-white px-5 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F4F6] text-xl text-[#8C949E]">!</span>
    <p className="mt-4 font-semibold text-[#2A2D31]">{title}</p><p className="mt-2 text-sm text-[#7B838D]">{description}</p>
  </div>;
}

export function AdminSpinner() {
  return <div className="flex min-h-60 items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#DDE3E7] border-t-[#2FC985]" /></div>;
}
