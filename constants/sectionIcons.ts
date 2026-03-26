export interface SectionIconOption {
  name: string;
  color: string;
  bg: string;
}

export const SECTION_ICON_OPTIONS: SectionIconOption[] = [
  { name: 'gamepad-variant-outline', color: '#4C6EF5', bg: '#EDF2FF' },
  { name: 'music-note-outline', color: '#E64980', bg: '#FFF0F6' },
  { name: 'theater', color: '#F08C00', bg: '#FFF4E6' },
  { name: 'dice-multiple-outline', color: '#7048E8', bg: '#F3F0FF' },
  { name: 'palette-outline', color: '#0CA678', bg: '#EBFBEE' },
  { name: 'car-outline', color: '#1C7ED6', bg: '#E7F5FF' },
  { name: 'hanger', color: '#C2255C', bg: '#FFF0F6' },
  { name: 'book-open-page-variant-outline', color: '#5F3DC4', bg: '#F8F0FC' },
  { name: 'party-popper', color: '#E8590C', bg: '#FFF4E6' },
  { name: 'trophy-outline', color: '#D9480F', bg: '#FFF4E6' },
  { name: 'food-variant', color: '#D9480F', bg: '#FFF3E8' },
  { name: 'movie-open-outline', color: '#4C6EF5', bg: '#EDF2FF' },
  { name: 'microphone-variant', color: '#AE3EC9', bg: '#F8F0FC' },
  { name: 'star-four-points-outline', color: '#C2255C', bg: '#FFF0F6' },
  { name: 'medal-outline', color: '#C97F00', bg: '#FFF9DB' },
  { name: 'controller-classic-outline', color: '#364FC7', bg: '#EDF2FF' },
  { name: 'camera-outline', color: '#1C7ED6', bg: '#E7F5FF' },
  { name: 'cat', color: '#0CA678', bg: '#EBFBEE' },
  { name: 'leaf', color: '#2B8A3E', bg: '#EBFBEE' },
  { name: 'sword-cross', color: '#6741D9', bg: '#F3F0FF' },
  { name: 'robot-outline', color: '#1864AB', bg: '#E7F5FF' },
  { name: 'pokeball', color: '#E03131', bg: '#FFF5F5' },
  { name: 'cards-outline', color: '#A61E4D', bg: '#FFF0F6' },
  { name: 'table-furniture', color: '#495057', bg: '#F8F9FA' },
  { name: 'account-group-outline', color: '#0B7285', bg: '#E3FAFC' },
  { name: 'gift-outline', color: '#E64980', bg: '#FFF0F6' },
  { name: 'firework', color: '#D9480F', bg: '#FFF4E6' },
  { name: 'lan', color: '#1C7ED6', bg: '#E7F5FF' },
  { name: 'chess-king', color: '#7048E8', bg: '#F3F0FF' },
  { name: 'bullhorn-outline', color: '#E8590C', bg: '#FFF4E6' },
];

const ICON_SET = new Set(SECTION_ICON_OPTIONS.map((i) => i.name));

export const isSectionIconName = (value: string): boolean => ICON_SET.has(value);

export const getSectionIconOption = (name: string): SectionIconOption | undefined =>
  SECTION_ICON_OPTIONS.find((i) => i.name === name);
