// Canonical appearance descriptions for The Gents.
// Used by portrait generation, restyle, lore, and cover generation.

export const GENT_APPEARANCES: Record<string, string> = {
  haris: 'A lean, angular-faced man in his 40s with a completely shaved head (not naturally bald — clean-shaven scalp). The most distinct feature is a prominent, substantial handlebar mustache with tightly waxed, upward-curled tips. This is framed by a very short, neatly trimmed close-cropped beard and goatee along the jaw and chin. Medium complexion.',
  vedad: 'A tall, well-built man in his mid-30s. He has a thick head of dark brown hair, featuring a clean, short taper on the sides and back, with the longer top styled upward and back into a textured quiff. The most distinct feature is a full, well-groomed dark brown beard — not bushy, neatly shaped and maintained. This is framed by a neatly trimmed matching mustache and meticulously defined, sharp lines along the cheeks and neck. Light complexion.',
  almedin: 'A solid, average-built man in his late 40s. He has short dark hair featuring a tight high fade on the sides and back, with the slightly longer top textured and styled slightly upward. The most distinct feature is his clean-shaven face with a faint, natural five o\'clock shadow. This is framed by a chiseled, square jawline and strong, defined facial structure. He possesses intense, deep-set dark eyes and a strong, well-proportioned nose. Medium complexion.',
  mirza: 'Details pending — physical appearance to be provided by the gents. Placeholder: a man in his 30s-40s, build and features to be confirmed from photos.',
}

export const GENT_ALIASES: Record<string, string> = {
  haris: 'Lorekeeper',
  vedad: 'Beard & Bass',
  almedin: 'Keys & Cocktails',
  mirza: 'Retired Operative',
}

// Visual identification guide for AI vision prompts (lore, scene analysis)
export const GENT_VISUAL_ID = `The Gents — visual identification:
- Haris (alias "Lorekeeper"): completely shaved head, handlebar mustache with waxed upward-curled tips, close-cropped beard
- Vedad (alias "Beard & Bass"): dark brown textured quiff, full groomed dark brown beard, light complexion
- Almedin (alias "Keys & Cocktails"): short dark hair with high fade, clean-shaven, square jawline, deep-set dark eyes
- Mirza (alias "Retired Operative"): appearance details pending, identify from context and other gents' presence
Use their first names naturally in the narrative when you can identify them in photos.`
