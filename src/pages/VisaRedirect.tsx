import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Spinner } from '@/components/ui'
import { fetchStamp } from '@/data/stamps'

/** Redirects /passport/visa/:stampId → /chronicle/:entryId */
export default function VisaRedirect() {
  const { stampId } = useParams<{ stampId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!stampId) { navigate('/passport', { replace: true }); return }
    fetchStamp(stampId).then(s => {
      if (s?.entry_id) {
        navigate(`/chronicle/${s.entry_id}`, { replace: true })
      } else {
        navigate('/passport', { replace: true })
      }
    }).catch(() => {
      navigate('/passport', { replace: true })
    })
  }, [stampId, navigate])

  return (
    <div className="flex items-center justify-center" style={{ height: '100dvh' }}>
      <Spinner size="lg" />
    </div>
  )
}
