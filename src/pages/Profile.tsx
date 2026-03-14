import { useRef, useState } from 'react'
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

export default function Profile() {
  const { gent, setGent } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)

  const [displayName, setDisplayName] = useState(gent?.display_name ?? '')
  const [bio, setBio] = useState(gent?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [generatingPortrait, setGeneratingPortrait] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const updated = await updateGent(gent.id, { display_name: displayName, bio })
      if (updated) {
        setGent({ ...gent, display_name: displayName, bio })
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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!gent) return
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${gent.id}/avatar-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      const updated = await updateGent(gent.id, { avatar_url: publicUrl })
      if (updated) {
        setGent({ ...gent, avatar_url: publicUrl })
        addToast('Avatar updated.', 'success')
      } else {
        addToast('Avatar uploaded but profile update failed.', 'error')
      }
    } catch {
      addToast('Failed to upload avatar.', 'error')
    } finally {
      setUploadingAvatar(false)
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleGeneratePortrait() {
    if (!gent) return
    setGeneratingPortrait(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-portrait', {
        body: { gent_id: gent.id, display_name: gent.display_name, alias: gent.full_alias },
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

  return (
    <>
      <TopBar title="Profile" />
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
              {(uploadingAvatar || generatingPortrait) && (
                <div className="absolute inset-0 rounded-full bg-obsidian/70 flex items-center justify-center">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </motion.div>

          {/* Avatar actions */}
          <motion.div variants={staggerItem} className="flex gap-2 mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar || generatingPortrait}
              className="text-xs text-ivory-dim font-body border border-white/10 rounded-full px-4 py-1.5 hover:border-white/30 transition-colors disabled:opacity-40"
            >
              {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
            </button>
            <button
              onClick={handleGeneratePortrait}
              disabled={uploadingAvatar || generatingPortrait}
              className="text-xs text-gold font-body border border-gold/30 rounded-full px-4 py-1.5 hover:border-gold/60 transition-colors disabled:opacity-40"
            >
              {generatingPortrait ? 'Generating…' : 'AI portrait'}
            </button>
          </motion.div>

          {/* Identity */}
          <motion.div variants={staggerItem} className="text-center mb-1">
            <h1 className="font-display text-2xl text-ivory">{gent.display_name}</h1>
          </motion.div>
          <motion.div variants={staggerItem} className="text-center mb-3">
            <span className="text-gold text-sm font-body">{gent.full_alias}</span>
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
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                placeholder="Your name"
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
                disabled={saving || uploadingAvatar}
              >
                Save Changes
              </Button>
            </div>

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
