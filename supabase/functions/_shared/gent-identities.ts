// Canonical appearance descriptions for The Gents.
// Used by portrait generation, restyle, lore, and cover generation.

export const GENT_APPEARANCES: Record<string, string> = {
  haris: 'A lean, angular-faced man in his 40s with a completely shaved head (not naturally bald — clean-shaven scalp). The most distinct feature is a prominent, substantial handlebar mustache with tightly waxed, upward-curled tips, framed by a short, neatly trimmed goatee and close-cropped beard along the jaw and chin. Lean build, medium complexion. Often seen in muted tones — greens, teals, earth colours. The most instantly recognizable of the group due to the shaved head + handlebar mustache combination.',
  vedad: 'A tall, well-built, athletic man in his mid-30s — the second tallest after Mirza, but leaner and more muscular. Dark brown hair with a clean taper on the sides, the longer top styled into a textured quiff. The most distinct feature is a full, well-groomed dark brown beard — neatly shaped, not bushy, with defined sharp lines along the cheeks and neck. Light complexion, broad shoulders. Carries himself with a relaxed confidence.',
  almedin: 'A solid, average-height man in his late 40s — the oldest-looking of the group. Distinctive SALT-AND-PEPPER GREYING hair with a tight high fade on the sides, the top textured and styled slightly upward. His greying hair is a key identifier — the other three all have darker brown hair. Clean-shaven face with at most a faint five o\'clock shadow — never a full beard. Distinguished by a chiseled, square jawline and strong facial structure with intense, deep-set dark eyes. Medium complexion. Sometimes wears rectangular glasses. The most fashion-forward dresser of the group.',
  mirza: 'The tallest and broadest of the group — a tall, solidly built man in his mid-30s with a round, broad face. Slightly taller and noticeably wider than Vedad. Short dark-blond to light-brown hair, usually cropped short on top. Most often seen with a short, trimmed full beard (ranging from heavy stubble to a short full beard — never clean-shaven, never long). Sometimes wears thin-framed rectangular glasses. Fair to light complexion with ruddy undertones. Carries a relaxed, easygoing energy.',
}

export const GENT_ALIASES: Record<string, string> = {
  haris: 'Lorekeeper',
  vedad: 'Beard & Bass',
  almedin: 'Keys & Cocktails',
  mirza: 'Retired Operative',
}

// Visual identification guide for AI vision prompts (lore, scene analysis)
export const GENT_VISUAL_ID = `The Gents — visual identification guide:
- Haris ("Lorekeeper"): SHAVED HEAD + HANDLEBAR MUSTACHE. Lean build. NEVER wears glasses. The most distinctive — look for the bald scalp and curled mustache tips. If someone looks bald but wears glasses, that is Mirza, not Haris.
- Vedad ("Beard & Bass"): TALL + FULL DARK BEARD (longer, groomed — NOT short stubble). Dark quiff hairstyle. Athletic, lean-muscular build. NEVER wears glasses. To distinguish from Mirza: Vedad is slightly shorter and leaner, his beard is fuller and longer, his face is narrower.
- Almedin ("Keys & Cocktails"): SALT-AND-PEPPER GREY HAIR + CLEAN-SHAVEN. The oldest-looking — greying hair distinguishes him from the others who have darker brown hair. High fade, square jaw, intense deep-set dark eyes. Sometimes wears rectangular glasses.
- Mirza ("Retired Operative"): TALLEST + BROADEST + SHORT BEARD + ROUND FACE. The biggest person in the group — slightly taller and noticeably broader than Vedad. Fair complexion. Sometimes wears glasses (Haris never does — if bald-looking + glasses = Mirza). Short cropped hair that can appear bald in low light. A retired member — no longer active.
When sunglasses or poor lighting hide facial details, use BODY TYPE as primary identifier: Mirza=tallest+broadest(biggest overall), Vedad=tall+athletic(leaner than Mirza), Haris=leanest, Almedin=average+oldest-looking.
Use their first names naturally in the narrative when you can identify them in photos.`
