import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, ShieldCheck, Database, HardDrive, Cloud } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import './BackupPage.css'

const failure = error => error.response?.data?.message || error.response?.data?.detail || 'Unable to complete backup request'
const date = value => value ? new Date(value).toLocaleString() : '—'
const size = value => value == null ? '—' : `${(value / 1024 / 1024).toFixed(2)} MB`

export default function BackupPage() {
  const [data, setData] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const refresh = useCallback(async (reset = false) => {
    try { const response = await api.get('/backup'); setData(response.data); setError(''); if (reset) setForm(response.data.settings) }
    catch (error) { setError(failure(error)) }
  }, [])
  useEffect(() => { refresh(true) }, [refresh])
  const running = data?.jobs?.some(job => ['QUEUED', 'RUNNING'].includes(job.status))
  useEffect(() => { if (!running) return; const interval = setInterval(() => refresh(), 4000); return () => clearInterval(interval) }, [running, refresh])
  const dirty = form && data && JSON.stringify(form) !== JSON.stringify(data.settings)
  const change = (name, value) => setForm(previous => ({ ...previous, [name]: value }))
  const save = async event => {
    event.preventDefault(); setBusy('save')
    try { const response = await api.put('/backup/settings', form); setData(response.data); setForm(response.data.settings); toast.success('Backup settings saved') }
    catch (error) { toast.error(failure(error)) } finally { setBusy('') }
  }
  const run = async () => {
    setBusy('run')
    try { await api.post('/backup/run'); toast.success('Backup queued'); await refresh() }
    catch (error) { toast.error(failure(error)) } finally { setBusy('') }
  }
  const download = async job => {
    setBusy(job.id)
    try {
      const response = await api.get(`/backup/jobs/${job.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = job.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { toast.error('Backup download failed. Refresh the history and try again.') } finally { setBusy('') }
  }
  const verify = async job => {
    setBusy(job.id)
    try { const response = await api.post(`/backup/jobs/${job.id}/verify`); toast.success(response.data.message, { duration: 6000 }); await refresh() }
    catch (error) { toast.error(failure(error)) } finally { setBusy('') }
  }
  return <div className="backup-page">
    <PageHeader title="Backup & recovery" subtitle="Encrypted platform backups · database and uploaded files" actions={<Button variant="secondary" onClick={() => refresh()}><RefreshCw size={14} /> Refresh</Button>} />
    <div className="backup-notice"><ShieldCheck size={20} /><div><strong>Platform Super Admin only</strong><p>Backups contain data from all organizations. Archives are encrypted. Keep the server encryption key in a separate secure location; it is required for recovery.</p></div></div>
    {error && <div role="alert" className="backup-error">{error} <button type="button" onClick={() => refresh(!form)}>Retry</button></div>}
    {!form ? <p role="status">Loading backup configuration…</p> : <>
      <div className="backup-layout">
        <form className="backup-card" onSubmit={save}>
          <h2>Backup configuration</h2><p className="backup-help">Encrypted archives are saved in the private server backup directory.</p>
          <div className="backup-options">
            <label><input type="checkbox" checked={form.databaseEnabled} onChange={event => change('databaseEnabled', event.target.checked)} /><Database size={18} /><span><strong>Database</strong><small>All organizations, employee records and configuration</small></span></label>
            <label><input type="checkbox" checked={form.mediaEnabled} onChange={event => change('mediaEnabled', event.target.checked)} /><HardDrive size={18} /><span><strong>Uploaded files</strong><small>Profile photos, documents and other media</small></span></label>
            <label><input type="checkbox" checked={form.driveEnabled} disabled={!data.driveConfigured} onChange={event => change('driveEnabled', event.target.checked)} /><Cloud size={18} /><span><strong>Copy to Google Drive</strong><small>{data.driveConfigured ? 'Upload the encrypted archive to the configured Shared Drive folder' : 'Not configured. Requires server-side service account credentials and a Shared Drive folder.'}</small></span></label>
          </div>
          {!data.databaseAvailable && <p role="alert" className="backup-error">PostgreSQL backup tools are not configured on the server. Database backups cannot run yet.</p>}
          <label className="backup-switch"><input type="checkbox" checked={form.scheduleEnabled} onChange={event => change('scheduleEnabled', event.target.checked)} /> Enable automatic backups</label>
          <div className="backup-fields">
            <label>Frequency<select value={form.frequency} onChange={event => change('frequency', event.target.value)}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly · Monday</option><option value="MONTHLY">Monthly · first day</option></select></label>
            <label>Time<input type="time" required value={`${String(form.hour).padStart(2, '0')}:${String(form.minute).padStart(2, '0')}`} onChange={event => { const [hour, minute] = event.target.value.split(':').map(Number); setForm(previous => ({ ...previous, hour, minute })) }} /></label>
            <label>Time zone<select value={form.timezone} onChange={event => change('timezone', event.target.value)}>{[...new Set([form.timezone, 'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles'])].map(zone => <option key={zone}>{zone}</option>)}</select></label>
          </div>
          <Button type="submit" loading={busy === 'save'} disabled={!!busy}>Save settings</Button>
        </form>
        <section className="backup-card backup-run"><div className="backup-shield"><ShieldCheck size={28} /></div><h2>Create a backup</h2><p className="backup-help">Runs in the background. You can leave this page and return to check the result.</p><dl><dt>Automatic schedule</dt><dd>{data.settings.scheduleEnabled ? data.settings.frequency.toLowerCase() : 'Off'}</dd><dt>Next run</dt><dd>{data.settings.scheduleEnabled ? date(data.nextRunAt) : 'Not scheduled'}</dd><dt>Archive protection</dt><dd>AES-256 encryption + SHA-256 checksums</dd></dl><Button onClick={run} loading={busy === 'run'} disabled={!!busy || running || dirty || form.databaseEnabled && !data.databaseAvailable}>{running ? 'Backup in progress…' : 'Back up now'}</Button>{dirty && <p className="backup-help">Save your changes before starting a backup.</p>}<p className="backup-help">Archive verification checks integrity. Recovery must be tested by restoring to a separate database. Live restore is intentionally unavailable here.</p></section>
      </div>
      <section className="backup-card backup-history"><h2>Backup history</h2><p className="backup-help">Latest 50 runs. Times use your browser’s time zone. A partial result means the local backup succeeded but the cloud copy failed.</p><div className="backup-table-scroll"><table><thead><tr>{['Started / requested','Status','Contents / size','Integrity','Cloud copy','Actions'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.jobs.map(job => <tr key={job.id}><td>{date(job.created_at)}<small>{job.source} · {job.requested_by}</small></td><td><span className={`backup-badge backup-status-${job.status.toLowerCase()}`}>{job.status}</span>{job.error && <small className="backup-job-error">{job.error}</small>}</td><td>{size(job.bytes)}<small>{job.filename || 'Not completed'}</small></td><td>{job.verified_at ? <>Verified<small>{date(job.verified_at)}</small></> : 'Not verified'}</td><td>{job.drive_status.replaceAll('_', ' ')}</td><td>{['SUCCEEDED','PARTIAL'].includes(job.status) && <div className="backup-row-actions"><Button size="sm" variant="secondary" disabled={!!busy} onClick={() => download(job)}><Download size={13} /> Download</Button><Button size="sm" variant="secondary" disabled={!!busy} onClick={() => verify(job)}>Verify</Button></div>}</td></tr>)}</tbody></table>{!data.jobs.length && <p className="backup-empty">No backups yet. Create your first backup above.</p>}</div></section>
    </>}
  </div>
}
