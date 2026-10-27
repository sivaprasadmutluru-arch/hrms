import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import DataTable from './DataTable'

export default function SetupDirectory({ title, subtitle, icon, itemLabel, action, data, columns, searchText, loading = false }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return data
    return data.filter(item => searchText(item).toLowerCase().includes(needle))
  }, [data, query, searchText])

  return (
    <div className="setup-directory-page">
      <section className="setup-directory-hero">
        <div className="setup-directory-icon">{icon}</div>
        <div className="setup-directory-copy">
          <span className="setup-directory-kicker">PEOPLE OPERATIONS <i /> COMPANY SETUP</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="setup-directory-action">
          <span><b>{data.length}</b> {itemLabel}{data.length === 1 ? '' : 's'}</span>
          {action}
        </div>
      </section>
      <section className="setup-directory-card">
        <div className="setup-directory-toolbar">
          <div><h2>All {title.toLowerCase()}</h2><p>Search and manage your company setup.</p></div>
          <label className="setup-directory-search"><Search size={17} /><input aria-label={`Search ${title.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}</label>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} />
        {!loading && <div className="setup-directory-footnote">Showing <b>{filtered.length}</b> of <b>{data.length}</b> {itemLabel.toLowerCase()}{data.length === 1 ? '' : 's'}</div>}
      </section>
    </div>
  )
}
