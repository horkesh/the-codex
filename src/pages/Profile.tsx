import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { HelpCircle, ChevronRight, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { supabase } from '@/lib/supabase'
import { updateGent } from '@/data/gents'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-ivory-dim text-xs uppercase tracking-widest font-body">{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}

// Compress and convert image file to base64 for AI analysis
async function fileToBase64(file: File, maxWidth = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        // Strip the data:image/...;base64, prefix — Gemini wants raw base64
        resolve(canvas.toDataURL('image/jpeg', 0.5).split(',')[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
      const photo_base64 = await fileToBase64(file)

      const { data, error } = await supabase.functions.invoke('generate-portrait', {
        body: { gent_id: gent.id, display_name: gent.display_name, photo_base64 },
      })

      if (error || !data?.portrait_url) throw new Error(error?.message ?? 'No portrait returned')

      const updated = await updateGent(gent.id, { avatar_url: data.portrait_url })
      if (updated) {
        setGent({ ...gent, avatar_url: data.portrait_url })
        addToast('Portrait generated.', 'success')
      }
    } catch {
      addToast('Portrait generation failed. Try again.', 'error')
    } finally {
      setGeneratingPortrait(false)
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
