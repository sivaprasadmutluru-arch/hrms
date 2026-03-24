export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base', xl: 'h-14 w-14 text-lg' }
  const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  if (src) return <img src={src} alt={name} className={`rounded-full object-cover ${sizes[size]} ${className}`} />
  return (
    <div className={`rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold ${sizes[size]} ${className}`}>
      {initials}
    </div>
  )
}
