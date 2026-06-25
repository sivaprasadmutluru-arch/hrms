import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMyWorkInfo, selectEssWorkInfo } from '../../features/ess/essSlice'
import Avatar from './Avatar'
import useAuth from '../../hooks/useAuth'
import { API_BASE_URL } from '../../config/constants'

export default function WelcomeHeader() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const workInfo = useSelector(selectEssWorkInfo)

  useEffect(() => {
    if (!workInfo) dispatch(fetchMyWorkInfo())
  }, [dispatch, workInfo])

  const firstName = user?.firstName || user?.username || 'there'
  const companyName = user?.companyName
  const companyLogoUrl = user?.companyLogoUrl

  // Compute profile photo URL from user.photoPath
  const photoUrl = user?.photoPath
    ? (user.photoPath.startsWith('http')
        ? user.photoPath
        : `${API_BASE_URL.replace('/api', '')}/media/${user.photoPath.replace(/^\//, '')}`)
    : null
  const jobPosition = workInfo?.jobPositionName
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date())

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex items-center gap-6 w-full">
      {/* Avatar + name */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar name={firstName} src={photoUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Welcome back</p>
          <h2 className="text-base font-bold text-gray-900 truncate">{firstName}</h2>
          {jobPosition && (
            <p className="text-xs font-medium text-indigo-600 mt-0.5 truncate">{jobPosition}</p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-gray-100 flex-shrink-0" />

      {/* Date + company */}
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Today</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{dateStr}</p>
        {companyName && (
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {companyLogoUrl && (
              <img src={companyLogoUrl} alt="logo" className="h-3.5 w-3.5 rounded object-contain" />
            )}
            <p className="text-xs text-gray-400">{companyName}</p>
          </div>
        )}
      </div>
    </div>
  )
}
