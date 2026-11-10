import { LoaderCircle } from 'lucide-react'

export default function SaveProgressCard({ title, message }) {
  return <div role="status" aria-live="polite" aria-atomic="true" aria-busy="true" className="flex items-center gap-3 rounded-lg border border-[#d9e7f5] bg-[#f5f9ff] px-4 py-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#2f73b9]">
      <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-[#173858]">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#55718b]">{message}</p>
    </div>
  </div>
}
