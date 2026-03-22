// Canonical appearance descriptions for The Gents.
// Used by portrait generation, restyle, lore, and cover generation.

export const GENT_APPEARANCES: Record<string, string> = {
  haris: 'A lean, angular-faced man in his 40s with a completely shaved head (not naturally bald — clean-shaven scalp). The most distinct feature is a prominent, substantial handlebar mustache with tightly waxed, upward-curled tips, framed by a short, neatly trimmed goatee and close-cropped beard along the jaw and chin. Lean build, medium complexion. Often seen in muted tones — greens, teals, earth colours. The most instantly recognizable of the group due to the shaved head + handlebar mustache combination.',
  vedad: 'The tallest of the group — a well-built, athletic man in his mid-30s. Dark brown hair with a clean taper on the sides, the longer top styled into a textured quiff. The most distinct feature is a full, well-groomed dark brown beard — neatly shaped, not bushy, with defined sharp lines along the cheeks and neck. Light complexion, broad shoulders. Often the tallest person in any group photo. Carries himself with a relaxed confidence.',
  almedin: 'A solid, average-height man in his late 40s. Short dark hair with a tight high fade on the sides, the top textured and styled slightly upward. Clean-shaven face with at most a faint five o\'clock shadow — never a full beard. Distinguished by a chiseled, square jawline and strong facial structure with intense, deep-set dark eyes. Medium complexion. Sometimes wears rectangular glasses. The most fashion-forward dresser of the group.',
  mirza: 'A stocky, solidly built man in his mid-30s with a round, broad face. Short dark-blond to light-brown hair, usually cropped short on top. Most often seen with a short, trimmed full beard (ranging from heavy stubble to a short full beard — never clean-shaven, never long). Sometimes wears thin-framed rectangular glasses. Fair to light complexion with ruddy undertones. The broadest and most solidly built of the group. Carries a relaxed, easygoing energy.',
}

export const GENT_ALIASES: Record<string, string> = {
  haris: 'Lorekeeper',
  vedad: 'Beard & Bass',
  almedin: 'Keys & Cocktails',
  mirza: 'Retired Operative',
}

// Visual identification guide for AI vision prompts (lore, scene analysis)
export const GENT_VISUAL_ID = `The Gents — visual identification guide:
- Haris ("Lorekeeper"): SHAVED HEAD + HANDLEBAR MUSTACHE. Lean build. The most distinctive — look for the bald scalp and curled mustache tips.
- Vedad ("Beard & Bass"): TALLEST + FULL DARK BEARD. Dark quiff hairstyle. Broad shoulders, athletic build. Always the tallest in the frame.
- Almedin ("Keys & Cocktails"): SHORT DARK HAIR + CLEAN-SHAVEN. High fade, square jaw, deep-set dark eyes. Sometimes wears rectangular glasses.
- Mirza ("Retired Operative"): STOCKY BUILD + SHORT BEARD + ROUND FACE. Fair complexion. Broadest of the group. Sometimes wears glasses. Short cropped hair. A retired member — no longer active.
Use their first names naturally in the narrative when you can identify them in photos.`
