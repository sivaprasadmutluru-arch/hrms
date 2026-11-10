import { useState } from 'react'
import Button from '../../components/common/Button'
import toast from 'react-hot-toast'

export default function CareersIntegrationPanel({ settings }) {
  const [open, setOpen] = useState(false)
  const base = window.location.origin
  const careersUrl = settings.careersUrl || `${base}/careers/${settings.slug}`
  const widgetUrl = settings.widgetUrl || `${base}/careers-widget.js`
  const feedUrl = `${new URL(widgetUrl).origin}/api/public/careers/${encodeURIComponent(settings.slug)}/jobs`
  const escaped = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const snippet = `<script src="${escaped(widgetUrl)}" defer crossorigin="anonymous"></script>\n<accruehr-careers organization="${escaped(settings.slug)}" accent="#2868a9"></accruehr-careers>`
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); toast.success('Copied') }
    catch { toast.error('Copy unavailable. Select and copy the text below.') }
  }
  return <section className="mb-5 rounded-xl border border-blue-100 bg-white p-5">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1"><h2 className="font-semibold text-slate-900">Connect your careers website</h2><p className="mt-1 text-sm text-slate-600">Keep your existing website. Display live openings and receive applications in AccrueHr.</p></div>
      <Button variant="secondary" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide integration' : 'Website integration'}</Button>
      <a className="text-sm text-blue-700 underline" href={careersUrl} target="_blank" rel="noreferrer">Open careers page ↗</a>
    </div>
    {open && <div className="mt-5 grid gap-5">
      <div><h3 className="font-semibold">1. Link to your openings</h3><p className="my-2 text-sm text-slate-600">Use this URL for a Careers button on your website.</p><input aria-label="Public careers URL" className="w-full rounded-lg border border-slate-200 p-3 text-sm" readOnly value={careersUrl} onFocus={event => event.target.select()} /><Button className="mt-2" size="sm" variant="secondary" onClick={() => copy(careersUrl)}>Copy link</Button></div>
      <div><h3 className="font-semibold">2. Embed a live job board</h3><p className="my-2 text-sm text-slate-600">Paste this into an HTML or custom code block. Works with plain HTML, WordPress, Webflow and other sites that allow scripts. Apply opens the secure application form in a new tab.</p><textarea aria-label="Careers widget embed code" className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs" rows={4} readOnly value={snippet} onFocus={event => event.target.select()} /><Button className="mt-2" size="sm" variant="secondary" onClick={() => copy(snippet)}>Copy embed code</Button></div>
      <div><h3 className="font-semibold">3. Use your own design</h3><p className="my-2 text-sm text-slate-600">Fetch the public JSON jobs feed without a login or API key. Render the jobs in your website and link each Apply button to its applyUrl.</p><input aria-label="Public jobs feed URL" className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs" readOnly value={feedUrl} onFocus={event => event.target.select()} /><Button className="mt-2" size="sm" variant="secondary" onClick={() => copy(feedUrl)}>Copy feed URL</Button></div>
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">Only published, open jobs appear. Each organization has its own board. Your HR login and candidate records are never exposed by this feed. Use a public HTTPS deployment URL before installing on an external website.</p>
    </div>}
  </section>
}
