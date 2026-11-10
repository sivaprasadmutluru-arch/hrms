import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'
import './CareersPage.css'

// Deliberately independent of the signed-in HR session and company selector.
const publicApi = axios.create({ baseURL: API_BASE_URL })
export default function CareersPage() {
  const { slug, jobId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  useEffect(() => {
    let active = true
    setData(null); setError(''); setSuccess('')
    publicApi.get(`/public/careers/${encodeURIComponent(slug)}/jobs${jobId ? `/${jobId}` : ''}`)
      .then(r => { if (active) setData(r.data) })
      .catch(() => { if (active) setError('This careers page or opening is unavailable. It may have closed.') })
    return () => { active = false }
  }, [slug, jobId])
  async function apply(event) {
    event.preventDefault(); setError('')
    const form = new FormData(event.currentTarget)
    const resume = form.get('resume')
    if (resume?.size && (resume.size > 5 * 1024 * 1024 || !resume.name.toLowerCase().endsWith('.pdf'))) {
      setError('Choose a PDF resume up to 5 MB.'); return
    }
    setBusy(true)
    try {
      const { data } = await publicApi.post(`/public/careers/${encodeURIComponent(slug)}/jobs/${jobId}/apply`, form)
      setSuccess(data.message)
    } catch (e) { setError(e.response?.data?.message || 'Unable to submit. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="careers-page">
    <header><Link to={`/careers/${slug}`} className="careers-brand">{data?.organization || 'Careers'}</Link><span>Powered by AccrueHr</span></header>
    <main>
      {!data && !error && <p>Loading opportunities…</p>}
      {error && <p className="careers-error" role="alert">{error}</p>}
      {data && !jobId && <><p className="careers-eyebrow">BUILD YOUR NEXT CHAPTER</p><h1>Join {data.organization}</h1><p className="careers-intro">Explore our open roles. We look forward to hearing from you.</p><div className="careers-jobs">
        {data.jobs.length === 0 && <section><h2>No open positions right now</h2><p>Please check back for new opportunities.</p></section>}
        {data.jobs.map(job => <Link className="careers-job" key={job.id} to={`/careers/${slug}/${job.id}`}><div><h2>{job.title}</h2><p>{[job.department, job.location, job.type?.replaceAll('_', ' ')].filter(Boolean).join(' · ')}</p></div><strong>View role →</strong></Link>)}
      </div></>}
      {data?.job && <><Link to={`/careers/${slug}`}>← All openings</Link><h1>{data.job.title}</h1><p className="careers-intro">{[data.job.department, data.job.location, data.job.type?.replaceAll('_', ' ')].filter(Boolean).join(' · ')}</p>{data.job.deadline && <p>Apply by {data.job.deadline}</p>}<div className="careers-detail"><section><h2>About the role</h2><p className="careers-description">{data.job.description || 'Please contact the hiring team for more information about this role.'}</p></section><section>
        {success ? <div role="status"><h2>Application received</h2><p>{success}</p><Link to={`/careers/${slug}`}>Browse other openings</Link></div> : <form onSubmit={apply}><h2>Apply for this role</h2><label>Full name<input name="name" required maxLength={200} autoComplete="name" /></label><label>Email<input type="email" name="email" required maxLength={254} autoComplete="email" /></label><label>Phone<input name="phone" type="tel" maxLength={40} autoComplete="tel" /></label><label>Resume (PDF, up to 5 MB)<input name="resume" type="file" accept=".pdf,application/pdf" /></label><label className="careers-honeypot" aria-hidden="true">Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="careers-consent"><input type="checkbox" name="consent" value="true" required />I agree that {data.organization} may use my details and resume to review this job application.</label><button disabled={busy} type="submit">{busy ? 'Submitting…' : 'Submit application'}</button><p className="careers-small">No account or password needed. Your application goes directly to the hiring team.</p></form>}
      </section></div></>}
    </main>
  </div>
}
