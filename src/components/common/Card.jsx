export default function Card({ children, className = '', padding = true, onClick }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}
