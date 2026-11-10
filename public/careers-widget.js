/* AccrueHr careers widget v1. Public job data only; no HR session or credentials. */
(() => {
  'use strict'
  const script = document.currentScript
  const serviceOrigin = new URL(script.src).origin
  if (customElements.get('accruehr-careers')) return
  class Careers extends HTMLElement {
    static get observedAttributes() { return ['organization', 'accent'] }
    constructor() { super(); this.attachShadow({ mode: 'open' }) }
    connectedCallback() { this.load() }
    disconnectedCallback() { this.controller?.abort() }
    attributeChangedCallback() { if (this.isConnected) this.load() }
    element(tag, text, className) {
      const el = document.createElement(tag)
      if (text) el.textContent = text
      if (className) el.className = className
      return el
    }
    async load() {
      this.controller?.abort()
      this.controller = new AbortController()
      const controller = this.controller
      this.shadowRoot.replaceChildren()
      const style = this.element('style')
      style.textContent = `:host{display:block;color:#18334d;font:16px/1.6 system-ui,sans-serif}*{box-sizing:border-box}.board{max-width:1120px;margin:auto}h2{font-size:28px;line-height:1.3;margin:0 0 8px}h3{font-size:19px;margin:0 0 5px}p{margin:0;color:#52697e}.list{display:grid;gap:14px;margin:24px 0}.job{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px;background:#fff;border:1px solid #d8e3ed;border-radius:14px}.job p{font-size:14px}.apply{display:inline-block;flex-shrink:0;border-radius:8px;padding:10px 18px;background:var(--accruehr-accent,#2868a9);color:white;font-weight:650;text-decoration:none}.apply:focus-visible,a:focus-visible,button:focus-visible{outline:3px solid #997117;outline-offset:4px}.footer{font-size:12px}a{color:var(--accruehr-accent,#2868a9)}button{cursor:pointer;background:white;border:1px solid #b8cbdc;border-radius:6px;padding:8px 16px;color:inherit}.error{padding:20px;border:1px solid #d8e3ed;border-radius:12px}@media(max-width:560px){.job{align-items:flex-start;flex-direction:column;gap:14px;padding:20px}}`
      const accent = this.getAttribute('accent')
      this.style.removeProperty('--accruehr-accent')
      if (/^#[0-9a-f]{6}$/i.test(accent || '')) this.style.setProperty('--accruehr-accent', accent)
      const board = this.element('section', null, 'board')
      board.setAttribute('aria-label', 'Job opportunities')
      const status = this.element('p', 'Loading opportunities…')
      status.setAttribute('role', 'status')
      board.append(status); this.shadowRoot.append(style, board)
      const slug = this.getAttribute('organization') || ''
      if (!/^[a-zA-Z0-9_-]{1,150}$/.test(slug)) { status.textContent = 'A valid organization is required.'; return }
      const url = new URL(`/api/public/careers/${encodeURIComponent(slug)}/jobs`, serviceOrigin)
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const response = await fetch(url, { credentials: 'omit', signal: controller.signal, referrerPolicy: 'no-referrer' })
        if (!response.ok) throw new Error('Unavailable')
        const data = await response.json()
        if (controller !== this.controller || !this.isConnected) return
        if (!Array.isArray(data.jobs)) throw new Error('Invalid feed')
        board.replaceChildren(this.element('h2', `Careers at ${data.organization}`), this.element('p', 'Explore our current openings and find your next role.'))
        const list = this.element('div', null, 'list')
        if (!data.jobs.length) list.append(this.element('p', 'No open positions right now. Please check back soon.'))
        for (const job of data.jobs) {
          const card = this.element('article', null, 'job')
          const details = this.element('div')
          details.append(this.element('h3', String(job.title || 'Open position')), this.element('p', [job.department, job.location, job.type?.replaceAll('_', ' ')].filter(Boolean).join(' · ')))
          // Build links from trusted script origin, never from feed-supplied HTML/URLs.
          const apply = this.element('a', 'View role & apply ↗', 'apply')
          apply.href = new URL(`/careers/${encodeURIComponent(slug)}/${encodeURIComponent(String(job.id))}`, serviceOrigin).href
          apply.target = '_blank'; apply.rel = 'noopener noreferrer'; apply.setAttribute('aria-label', `View ${job.title || 'role'} and apply (opens a new tab)`)
          card.append(details, apply); list.append(card)
        }
        const footer = this.element('p', 'Applications are securely managed by ', 'footer')
        const link = this.element('a', 'AccrueHr'); link.href = new URL(`/careers/${encodeURIComponent(slug)}`, serviceOrigin).href; link.target = '_blank'; link.rel = 'noopener noreferrer'
        footer.append(link); board.append(list, footer)
      } catch (error) {
        if (controller !== this.controller || !this.isConnected) return
        status.textContent = 'Openings are temporarily unavailable. Please try again.'
        status.className = 'error'; status.setAttribute('role', 'alert')
        const retry = this.element('button', 'Retry'); retry.type = 'button'; retry.addEventListener('click', () => this.load()); board.append(retry)
      } finally { clearTimeout(timeout) }
    }
  }
  customElements.define('accruehr-careers', Careers)
})()
