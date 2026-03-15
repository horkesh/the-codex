import { BookOpen, Bookmark, Users, BarChart2, Layers, List } from 'lucide-react'

export const NAV_SECTIONS = [
  {
    id: 'chronicle',
    label: 'Chronicle',   // full display title (Home cards, TopBar)
    navLabel: 'Chronicle', // compact label (SectionNav tabs)
    path: '/chronicle',
    icon: BookOpen,
    subtitle: 'The complete record',
    image: '/images/sections/chronicle.webp',
  },
  {
    id: 'passport',
    label: 'Passport',
    navLabel: 'Passport',
    path: '/passport',
    icon: Bookmark,
    subtitle: 'Stamps & achievements',
    image: '/images/sections/passport.webp',
  },
  {
    id: 'circle',
    label: 'The Circle',
    navLabel: 'Circle',
    path: '/circle',
    icon: Users,
    subtitle: 'People & connections',
    image: '/images/sections/circle.webp',
  },
  {
    id: 'ledger',
    label: 'Ledger',
    navLabel: 'Ledger',
    path: '/ledger',
    icon: BarChart2,
    subtitle: 'Stats & intelligence',
    image: '/images/sections/ledger.webp',
  },
  {
    id: 'studio',
    label: 'Studio',
    navLabel: 'Studio',
    path: '/studio',
    icon: Layers,
    subtitle: 'Export & create',
    image: '/images/sections/studio.webp',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    navLabel: 'Agenda',
    path: '/agenda',
    icon: List,
    subtitle: 'Wishlist & scouting',
    image: '/images/sections/bucket-list.webp',
  },
] as const
