import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { HelpCircle, ChevronRight, MapPin, Bell, BellOff, Check, Eye } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { toggleComfortMode, isComfortMode } from '@/hooks/useComfortMode'
import { motion, AnimatePresence } from 'framer-motion'
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
import { imageToJpegBase64, imageToWebpBlob } from '@/lib/image'
import { fetchToastGentStats } from '@/data/toast'
import type { ToastGentStats } from '@/types/app'

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
  const [showStatusInput, setShowStatusInput] = useState(false)
  const [statusInput, setStatusInput] = useState('')
  const { supported: pushSupported, subscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications()
  const [pushLoading, setPushLoading] = useState(false)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [toastStats, setToastStats] = useState<ToastGentStats[]>([])
  const [comfortEnabled, setComfortEnabled] = useState(() => gent ? isComfortMode(gent.id) : false)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Portrait selection state
  const [portraitOptions, setPortraitOptions] = useState<string[]>([])
  const [portraitLabels, setPortraitLabels] = useState<string[]>([])
  const [selectedPortrait, setSelectedPortrait] = useState<string | null>(null)
  const [settingAvatar, setSettingAvatar] = useState(false)

  useEffect(() => {
    if (!gent?.id) return
    fetchToastGentStats(gent.id)
      .then(setToastStats)
      .catch(() => {})
  }, [gent?.id])

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
    if (!generatingPortrait) return
    const t = setInterval(() => {}, 1000)
    return () => clearInterval(t)
  }, [generatingPortrait])

  async function handleGeneratePortraits(photoFile?: File) {
    if (!gent) return
    setGeneratingPortrait(true)
    setPortraitOptions([])
    setPortraitLabels([])
    setSelectedPortrait(null)
    try {
      const body: Record<string, string> = { gent_id: gent.id }
      if (photoFile) {
        body.photo_base64 = await imageToJpegBase64(photoFile, { maxPx: 400, quality: 0.5 })
      }

      const { data, error } = await supabase.functions.invoke('generate-portrait', { body })
      if (error || data?.error) throw new Error(error?.message ?? data?.error ?? 'Portrait generation failed')

      const urls: string[] = data?.portrait_urls ?? []
      const labels: string[] = data?.portrait_labels ?? []
      if (urls.length === 0) throw new Error('No portraits returned')

      setPortraitOptions(urls)
      setPortraitLabels(labels)
      // Update portrait_url in store (edge fn already saved first to DB)
      setGent({ ...gent, portrait_url: urls[0] })
      addToast('Choose your portrait.', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      addToast(`Portrait failed: ${msg}`, 'error')
    } finally {
      setGeneratingPortrait(false)
    }
  }

  async function handlePortraitPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoInputRef.current) photoInputRef.current.value = ''
    await handleGeneratePortraits(file)
  }

  async function handleSelectPortrait(url: string) {
    if (!gent || settingAvatar) return
    setSettingAvatar(true)
    try {
      const updated = await updateGent(gent.id, { avatar_url: url, portrait_url: url })
      if (updated) {
        setGent({ ...gent, avatar_url: url, portrait_url: url })
        setSelectedPortrait(url)
        addToast('Portrait set as profile picture.', 'success')
      }
    } catch {
      addToast('Failed to set portrait.', 'error')
    } finally {
      setSettingAvatar(false)
    }
  }

  async function handleChangePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!gent) return
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarInputRef.current) avatarInputRef.current.value = ''

    setUploadingPhoto(true)
    try {
      const blob = await imageToWebpBlob(file, { maxPx: 512, quality: 0.85 })
      const path = `${gent.id}/avatar-${Date.now()}.webp`

      const { error: uploadError } = await supabase.storage
        .from('portraits')
        .upload(path, blob, { upsert: false, contentType: 'image/webp' })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('portraits').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const updated = await updateGent(gent.id, { avatar_url: publicUrl })
      if (updated) {
        setGent({ ...gent, avatar_url: publicUrl })
        addToast('Photo updated.', 'success')
      }
    } catch {
      addToast('Failed to upload photo.', 'error')
    } finally {
      setUploadingPhoto(false)
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

  const busy = generatingPortrait || uploadingPhoto

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
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleChangePhoto} />
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePortraitPhotoSelected} />
          </motion.div>

          {/* Avatar action */}
          <motion.div variants={staggerItem} className="mb-6">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={busy}
              className="text-xs text-gold font-body border border-gold/30 rounded-full px-4 py-1.5 hover:border-gold/60 transition-colors disabled:opacity-40"
            >
              {uploadingPhoto ? 'Uploading...' : 'Change photo'}
            </button>
          </motion.div>

          {/* Portrait */}
          <motion.div variants={staggerItem} className="w-full max-w-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs tracking-[0.25em] uppercase text-ivory-dim font-body">Portrait</h2>
            </div>

            {/* Portrait options grid */}
            <AnimatePresence mode="wait">
              {generatingPortrait ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-dark border border-white/5 rounded-xl p-6 flex flex-col items-center gap-3"
                >
                  <div className="flex gap-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-20 h-20 rounded-full bg-white/5 animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-ivory-dim font-body mt-2">Generating three portraits...</p>
                </motion.div>
              ) : portraitOptions.length > 0 ? (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-dark border border-white/5 rounded-xl p-5"
                >
                  <p className="text-xs text-ivory-muted font-body text-center mb-4">
                    Tap a portrait to set it as your profile picture
                  </p>
                  <div className="flex justify-center gap-4 mb-4">
                    {portraitOptions.map((url, idx) => {
                      const isSelected = selectedPortrait === url || (!selectedPortrait && gent.avatar_url === url)
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => handleSelectPortrait(url)}
                          disabled={settingAvatar}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className={cn(
                            'relative w-22 h-22 rounded-full overflow-hidden border-2 transition-all duration-300',
                            isSelected
                              ? 'border-gold shadow-[0_0_12px_rgba(201,168,76,0.4)] scale-105'
                              : 'border-white/10 group-hover:border-gold/50'
                          )}>
                            <img
                              src={url}
                              alt={`Portrait ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-gold/15 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                  <Check size={14} className="text-obsidian" />
                                </div>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-ivory-dim font-body uppercase tracking-wider">
                            {portraitLabels[idx] ?? `Style ${idx + 1}`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGeneratePortraits()}
                      disabled={busy}
                      className="text-xs"
                    >
                      Regenerate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={busy}
                      className="text-xs"
                    >
                      From photo
                    </Button>
                  </div>
                </motion.div>
              ) : gent.portrait_url ? (
                <motion.div key="existing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-4">
                    <img
                      src={gent.portrait_url}
                      alt="Portrait"
                      className="w-24 h-24 rounded-full overflow-hidden border border-gold/30 object-cover"
                    />
                    <div>
                      <p className="text-xs text-ivory-muted font-body">AI-generated character portrait</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGeneratePortraits()}
                          loading={generatingPortrait}
                          className="text-xs"
                        >
                          Regenerate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={busy}
                          className="text-xs"
                        >
                          From photo
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="bg-slate-dark border border-white/5 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
                    <p className="text-xs text-ivory-dim font-body leading-relaxed">
                      Generate an AI portrait — a stylised character illustration used on your Calling Card export.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGeneratePortraits()}
                      loading={generatingPortrait}
                    >
                      Generate Portrait
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                placeholder="A few words about yourself..."
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

            {/* Comfort mode toggle */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-dark border border-white/5 mt-2"
              onClick={() => {
                if (!gent) return
                const enabled = toggleComfortMode(gent.id)
                setComfortEnabled(enabled)
                addToast(enabled ? 'Comfort mode enabled' : 'Comfort mode disabled', 'info')
              }}
            >
              <div className="flex items-center gap-3">
                <Eye size={16} className={comfortEnabled ? 'text-gold' : 'text-ivory-muted'} />
                <div className="text-left">
                  <p className="text-sm font-body font-medium">Comfort Mode</p>
                  <p className="text-xs text-ivory-muted font-body">Larger text and tap targets</p>
                </div>
              </div>
              <div className={cn('w-10 h-6 rounded-full transition-colors relative', comfortEnabled ? 'bg-gold' : 'bg-white/10')}>
                <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', comfortEnabled ? 'translate-x-5' : 'translate-x-1')} />
              </div>
            </button>

            {/* Toast Service Record */}
            {toastStats.length > 0 && (
              <>
                <SectionDivider label="Toast Service Record" />
                {toastStats.map((s) => (
                  <div key={s.id} className="bg-slate-dark rounded-xl p-4 border border-white/5 mb-2">
                    <p className="text-ivory font-body text-sm font-semibold capitalize">
                      {s.role === 'keys' ? 'Keys & Cocktails' : s.role === 'bass' ? 'Beard & Bass' : 'Lorekeeper'}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div>
                        <p className="text-gold font-display text-lg font-bold">{s.sessions_hosted}</p>
                        <p className="text-ivory-dim text-xs">Sessions</p>
                      </div>
                      {s.role === 'keys' && (
                        <>
                          <div>
                            <p className="text-gold font-display text-lg font-bold">{s.cocktails_crafted}</p>
                            <p className="text-ivory-dim text-xs">Cocktails</p>
                          </div>
                          <div>
                            <p className="text-gold font-display text-lg font-bold">{s.vibe_shifts_called}</p>
                            <p className="text-ivory-dim text-xs">Vibe Shifts</p>
                          </div>
                        </>
                      )}
                      {s.role === 'bass' && (
                        <>
                          <div>
                            <p className="text-gold font-display text-lg font-bold">{s.confessions_drawn}</p>
                            <p className="text-ivory-dim text-xs">Confessions</p>
                          </div>
                          <div>
                            <p className="text-gold font-display text-lg font-bold">{s.spotlights_given}</p>
                            <p className="text-ivory-dim text-xs">Spotlights</p>
                          </div>
                        </>
                      )}
                      {s.role === 'lorekeeper' && (
                        <>
                          <div>
                            <p className="text-gold font-display text-lg font-bold">{s.photos_taken}</p>
                            <p className="text-ivory-dim text-xs">Photos</p>
                          </div>
                          <div>
                            <p className="text-gold font-display text-lg font-bold">{s.reactions_sparked}</p>
                            <p className="text-ivory-dim text-xs">Reactions</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
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
