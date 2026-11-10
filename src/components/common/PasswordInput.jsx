import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const PasswordInput = forwardRef(function PasswordInput({ className = '', visibilityLabel = 'password', ...props }, ref) {
  const [visible, setVisible] = useState(false)
  return <div className="relative">
    <input {...props} ref={ref} type={visible ? 'text' : 'password'} className={`${className} pr-12`} />
    <button type="button" disabled={props.disabled} aria-label={`${visible ? 'Hide' : 'Show'} ${visibilityLabel}`} aria-pressed={visible}
      onMouseDown={event => event.preventDefault()} onClick={() => setVisible(value => !value)}
      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-slate-500 hover:text-[#2f73b9] focus-visible:outline-2 focus-visible:outline-[#2f73b9] disabled:opacity-50">
      {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
    </button>
  </div>
})
export default PasswordInput
