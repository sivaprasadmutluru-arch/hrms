import { UserRound, BriefcaseBusiness, MapPin, Phone, Wallet } from 'lucide-react'
import './ProfileFields.css'

export function Section({ title, children }) {
  const Icon = title === 'Personal Information' ? UserRound : title === 'Address' ? MapPin : title === 'Emergency Contact' ? Phone : title === 'Salary Components' ? Wallet : BriefcaseBusiness
  return <section className="profile-info-section" aria-label={title}>
    <div className="profile-info-heading"><span className="profile-info-icon"><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span><h3>{title}</h3></div>
    <dl className="profile-info-grid">{children}</dl>
  </section>
}

export function Field({ label, value }) {
  const present = value != null && value !== ''
  return <div className="profile-info-field"><dt>{label}</dt><dd className={present ? '' : 'profile-info-empty'}>{present ? value : 'Not provided'}</dd></div>
}
