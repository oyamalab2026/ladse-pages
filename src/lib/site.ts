import { parse } from 'yaml';
import membersRaw from '../data/members.yaml?raw';
import alumniRaw from '../data/alumni.yaml?raw';
import publicationsRaw from '../data/publications.yaml?raw';
import mediaData from '../data/media.json';
import categoryData from '../data/publication-categories.json';
export { default as downloads } from '../data/downloads.json';
export { default as resources } from '../data/resources.json';

export const languages = ['ja', 'en'] as const;
export type Lang = typeof languages[number];
export const tr = (lang: Lang, ja: string, en: string) => lang === 'ja' ? ja : en;
export const route = (lang: Lang, path = '') => `/${lang}/${path ? path.replace(/^\/+|\/+$/g, '') + '/' : ''}`;
export const media = mediaData as Record<string, string>;
export const asset = (path: string) => media[path] || '/archive/' + path;
export const siteName = 'Oyama Lab — LADSE';
export const contactEmail = 'oyama.akira@jaxa.jp';
export interface Member {
  id: string; group: string; groupLabel: string; name: string; nameEn: string; role: string;
  description: string; topic: string; topicEn: string; image: string | null;
}
export interface Publication { id: string; category: string; year: number | null; citation: string; links: string[]; }
export const members = parse(membersRaw) as Member[];
export const alumni = parse(alumniRaw) as Member[];
export const publications = parse(publicationsRaw) as Publication[];
export const categories = categoryData as Record<string, { ja: string; en: string }>;
export const groupLabels: Record<string, { ja: string; en: string }> = {
  staff: { ja: '教員・スタッフ', en: 'Faculty & staff' },
  students: { ja: '学生', en: 'Students' },
  collaborators: { ja: '共同研究者', en: 'Collaborators' },
};
export function dateLabel(date: Date | null, precision: string): string {
  if (!date) return '—';
  const stamp = date.toISOString().slice(0, 10).replaceAll('-', '.');
  return precision === 'year' ? stamp.slice(0, 4) : precision === 'month' ? stamp.slice(0, 7) : stamp;
}
export function dateTimeValue(date: Date | null, precision: string): string | undefined {
  if (!date) return undefined;
  const stamp = date.toISOString().slice(0, 10);
  return precision === 'year' ? stamp.slice(0, 4) : precision === 'month' ? stamp.slice(0, 7) : stamp;
}
export const newsCategories = {
  conference: { ja: '学会発表', en: 'Conferences' },
  award: { ja: '受賞・選出', en: 'Awards & selections' },
  lab: { ja: '研究室行事', en: 'Lab activities' },
  notice: { ja: 'お知らせ', en: 'Announcements' },
};
interface NewsOrderEntry { data: { date: Date | null; sourceOrder: number }; }
export function newsOrder(a: NewsOrderEntry, b: NewsOrderEntry): number {
  const left = a.data.date?.getTime() ?? -Infinity;
  const right = b.data.date?.getTime() ?? -Infinity;
  return left === right ? a.data.sourceOrder - b.data.sourceOrder : right - left;
}
