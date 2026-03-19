import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { HelpCircle, ChevronRight, MapPin, Bell, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { supabase } from '@/lib/supabase'
import { updateGent, updateGentStatus } from '@/data/gents'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { imageToJpegBase64 } from '@/lib/image'

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-ivory-dim text-xs uppercase tracking-widest font-body">{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}


export default function Profile() {
  const navigate = useNavigate()
  const { gent, setGent } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)

  const [name, setName] = useState(gent?.display_name ?? '')
  const [role, setRole] = useState(gent?.full_alias ?? '')
  const [bio, setBio] = useState(gent?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [generatingPortrait, setGeneratingPortrait] = useState(false)
  const [portraitSeconds, setPortraitSeconds] = useState(0)
  const [showStatusInput, setShowStatusInput] = useState(false)
  const [statusInput, setStatusInput] = useState('')
  const { supported: pushSupported, subscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications()
  const [pushLoading, setPushLoading] = useState(false)

  const photoInputRef = useRef<HTMLInputElement>(null)

  if (!gent) {
    return (
      <>
        <TopBar title="Profile" />
        <PageWrapper>
          <div className="flex items-center justify-center h-48">
            <Spinner size="md" />
          </div>
        </PageWrapper>
      </>
    )
  }

  async function handleSave() {
    if (!gent) return
    setSaving(true)
    try {
      const updated = await updateGent(gent.id, { display_name: name, full_alias: role, bio })
      if (updated) {
        setGent({ ...gent, display_name: name, full_alias: role, bio })
        addToast('Profile updated.', 'success')
      } else {
        addToast('Failed to save profile.', 'error')
      }
    } catch {
      addToast('Failed to save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!generatingPortrait) { setPortraitSeconds(0); return }
    const t = setInterval(() => setPortraitSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [generatingPortrait])

  async function handlePortraitPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!gent) return
    const file = e.target.files?.[0]
    if (!file) return
    if (photoInputRef.current) photoInputRef.current.value = ''

    setGeneratingPortrait(true)
    try {
      const photo_base64 = await imageToJpegBase64(file, { maxPx: 400, quality: 0.5 })

      const { data, error } = await supabase.functions.invoke('generate-portrait', {
        body: { gent_id: gent.id, photo_base64 },
      })

      if (error || !data?.portrait_url) throw new Error(error?.message ?? 'No portrait returned')

      // Edge function already updates portrait_url in DB; also set avatar_url to the new portrait
      const updated = await updateGent(gent.id, { avatar_url: data.portrait_url })
      if (updated) {
        setGent({ ...gent, avatar_url: data.portrait_url, portrait_url: data.portrait_url })
        addToast('Portrait generated.', 'success')
      }
    } catch {
      addToast('Portrait generation failed. Try again.', 'error')
    } finally {
      setGeneratingPortrait(false)
    }
  }

  async function handleGeneratePortrait() {
    if (!gent) return
    setGeneratingPortrait(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-portrait', {
        body: { gent_id: gent.id },
      })
      if (error || data?.error) throw new Error(error?.message ?? data?.error ?? 'Portrait generation failed')
      if (data?.portrait_url) {
        setGent({ ...gent, portrait_url: data.portrait_url })
        addToast('Portrait generated.', 'success')
      }
    } catch {
      addToast('Portrait generation failed.', 'error')
    } finally {
      setGeneratingPortrait(false)
    }
  }

  async function handleSetStatus() {
    if (!gent) return
    const trimmed = statusInput.trim()
    if (!trimmed) return
    try {
      await updateGentStatus(gent.id, trimmed, null)
      setGent({ ...gent, status: trimmed })
      setShowStatusInput(false)
      setStatusInput('')
      addToast('Status updated.', 'success')
    } catch {
      addToast('Failed to update status.', 'error')
    }
  }

  async function handleClearStatus() {
    if (!gent) return
    try {
      await updateGentStatus(gent.id, null, null)
      setGent({ ...gent, status: null, status_expires_at: null })
      addToast('Status cleared.', 'success')
    } catch {
      addToast('Failed to clear status.', 'error')
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      setGent(null)
      addToast('Signed out. Until next time.', 'info')
    } catch {
      addToast('Sign out failed.', 'error')
    }
  }

  const busy = generatingPortrait

  return (
    <>
      <TopBar
        title="Profile"
        right={
          <button
            type="button"
            onClick={() => navigate('/help')}
            className="flex items-center justify-center w-8 h-8 text-ivory-dim hover:text-gold transition-colors"
            aria-label="Field Guide"
          >
            <HelpCircle size={18} />
          </button>
        }
      />
      <PageWrapper>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col items-center pt-6 pb-16"
        >
          {/* Avatar */}
          <motion.div variants={staggerItem} className="relative mb-4">
            <div className="relative">
              <Avatar
                src={gent.avatar_url}
                name={gent.display_name}
                size="xl"
                active
              />
              {busy && (
                <div className="absolute inset-0 rounded-full bg-obsidian/70 flex items-center justify-center">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePortraitPhotoSelected} />
          </motion.div>

          {/* Avatar action */}
          <motion.div variants={staggerItem} className="mb-6">
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={busy}
              className="text-xs text-gold font-body border border-gold/30 rounded-full px-4 py-1.5 hover:border-gold/60 transition-colors disabled:opacity-40"
            >
              {generatingPortrait
                ? portraitSeconds < 3 ? 'Analysing…'
                  : `Painting… ${portraitSeconds}s`
                : 'Change photo'}
            </button>
          </motion.div>

          {/* Portrait */}
          <motion.div variants={staggerItem} className="w-full max-w-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs tracking-[0.25em] uppercase text-ivory-dim font-body">Portrait</h2>
            </div>
            {gent.portrait_url ? (
              <div className="flex items-center gap-4">
                <img
                  src={gent.portrait_url}
                  alt="Portrait"
                  className="w-24 h-24 rounded-full overflow-hidden border border-gold/30 object-cover"
                />
                <div>
                  <p className="text-xs text-ivory-muted font-body">AI-generated character portrait</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGeneratePortrait}
                    loading={generatingPortrait}
                    className="mt-2 text-xs"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-dark border border-white/5 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
                <p className="text-xs text-ivory-dim font-body leading-relaxed">
                  Generate an AI portrait — a stylised character illustration used on your Calling Card export.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGeneratePortrait}
                  loading={generatingPortrait}
                >
                  Generate Portrait
                </Button>
              </div>
            )}
          </motion.div>

          {/* Identity */}
          <motion.div variants={staggerItem} className="text-center mb-1">
            <h1 className="font-display text-2xl text-ivory">{gent.full_alias}</h1>
          </motion.div>
          <motion.div variants={staggerItem} className="text-center mb-3">
            <span className="text-gold text-sm font-body">{gent.display_name}</span>
          </motion.div>
          {gent.bio && (
            <motion.p
              variants={staggerItem}
              className="text-ivory-muted text-sm font-body text-center max-w-xs leading-relaxed mb-2"
            >
              {gent.bio}
            </motion.p>
          )}

          {/* Settings */}
          <motion.div variants={fadeUp} className="w-full max-w-sm mt-2">
            <SectionDivider label="Settings" />

            <div className="flex flex-col gap-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="Your first name"
                maxLength={48}
              />
              <Input
                label="Role"
                value={role}
                onChange={(e) => setRole((e.target as HTMLInputElement).value)}
                placeholder="e.g. Lorekeeper"
                maxLength={48}
              />
              <Input
                as="textarea"
                label="Bio"
                value={bio}
                onChange={(e) => setBio((e.target as HTMLTextAreaElement).value)}
                placeholder="A few words about yourself…"
                maxLength={280}
              />
              <Button
                variant="primary"
                fullWidth
                loading={saving}
                onClick={handleSave}
                disabled={saving || busy}
              >
                Save Changes
              </Button>
            </div>

            {/* Places */}
            <button
              type="button"
              onClick={() => navigate('/places')}
              className="w-full flex items-center justify-between py-3 border-t border-white/8 text-ivory-muted hover:text-ivory transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-body">
                <MapPin size={14} className="text-gold-muted" />
                Saved Places
              </span>
              <ChevronRight size={15} className="text-ivory-dim" />
            </button>

            {/* Status */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs tracking-[0.25em] uppercase text-ivory-dim font-body">Status</h2>
                {gent.status && (
                  <button
                    type="button"
                    onClick={handleClearStatus}
                    className="text-xs text-ivory-dim hover:text-ivory font-body transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {gent.status ? (
                <div className="bg-slate-dark border border-gold/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-ivory font-body">{gent.status}</span>
                  <button
                    type="button"
                    onClick={() => { setStatusInput(gent.status ?? ''); setShowStatusInput(true) }}
                    className="text-xs text-gold hover:text-gold/80 font-body transition-colors"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowStatusInput(true)}
                  className="w-full text-left bg-slate-dark border border-white/5 rounded-xl px-4 py-3 text-sm text-ivory-dim font-body hover:border-white/10 transition-colors"
                >
                  Set a status — "Out tonight · Mayfair"
                </button>
              )}
              {showStatusInput && (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={statusInput}
                    onChange={(e) => setStatusInput((e.target as HTMLInputElement).value)}
                    placeholder='Out tonight · Mayfair'
                    maxLength={60}
                    className="flex-1"
                  />
                  <Button size="sm" variant="primary" onClick={handleSetStatus}>Set</Button>
                </div>
              )}
            </div>

            {/* Notifications */}
            {pushSupported && (
              <>
                <SectionDivider label="Notifications" />
                <button
                  type="button"
                  disabled={pushLoading}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-slate-mid border border-white/8 text-ivory hover:border-white/15 transition-colors disabled:opacity-50"
                  onClick={async () => {
                    setPushLoading(true)
                    if (pushSubscribed) await pushUnsubscribe()
                    else await pushSubscribe()
                    setPushLoading(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    {pushSubscribed
                      ? <Bell size={16} className="text-gold" />
                      : <BellOff size={16} className="text-ivory-muted" />}
                    <div className="text-left">
                      <p className="text-sm font-body font-medium">Push Notifications</p>
                      <p className="text-xs text-ivory-muted font-body">
                        {pushSubscribed ? 'Enabled — tap to turn off' : 'Get notified of new entries and comments'}
                      </p>
                    </div>
                  </div>
                  <div className={cn('w-10 h-6 rounded-full transition-colors relative', pushSubscribed ? 'bg-gold' : 'bg-white/10')}>
                    <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', pushSubscribed ? 'translate-x-5' : 'translate-x-1')} />
                  </div>
                </button>
              </>
            )}

            {/* Account */}
            <SectionDivider label="Account" />

            <Button
              variant="ghost"
              fullWidth
              onClick={handleSignOut}
              className="text-[--color-error] hover:text-[--color-error] hover:bg-[--color-error]/10"
            >
              Sign Out
            </Button>
          </motion.div>
        </motion.div>
      </PageWrapper>
    </>
  )
}
