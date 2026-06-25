export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base', xl: 'h-14 w-14 text-lg' }
  const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'

  // Add cache-busting to prevent stale images after profile update
  const imgSrc = src
    ? (src.includes('?') ? `${src}&_t=${Date.now()}` : `${src}?_t=${Date.now()}`)
    : undefined

  if (imgSrc) return <img src={imgSrc} alt={name} className={`rounded-full object-cover ${sizes[size]} ${className}`} />
  return (
    <div className={`rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold ${sizes[size]} ${className}`}>
      {initials}
    </div>
  )
}
