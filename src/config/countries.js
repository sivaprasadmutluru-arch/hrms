export const COUNTRIES = [
  'India', 'United Arab Emirates', 'United States', 'United Kingdom', 'Canada',
  'Australia', 'New Zealand', 'Singapore', 'Malaysia', 'Philippines',
  'Saudi Arabia', 'Qatar', 'Oman', 'Bahrain', 'Kuwait',
  'Nepal', 'Sri Lanka', 'Bangladesh', 'Pakistan', 'Germany', 'France',
  'Netherlands', 'Ireland', 'South Africa', 'Japan',
].map(name => ({ value: name, label: name === 'United Arab Emirates' ? 'United Arab Emirates (Dubai / UAE)' : name === 'United States' ? 'United States (USA)' : name === 'United Kingdom' ? 'United Kingdom (UK)' : name }))

export const LAUNCH_COUNTRIES = ['India', 'United States', 'United Arab Emirates', 'United Kingdom'].map(value => COUNTRIES.find(country => country.value === value))
