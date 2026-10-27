export default function Card({ children, className = '', padding = true, onClick }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl shadow-[0_8px_28px_rgba(30,65,96,0.055)] border border-[#E5ECF3] ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}
