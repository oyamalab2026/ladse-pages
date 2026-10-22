import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const research = defineCollection({
  loader: glob({ base: './src/content/research', pattern: '**/*.md' }),
  schema: z.object({
    lang: z.enum(['ja', 'en']), topicSlug: z.string(), title: z.string(), titleEn: z.string(),
    summary: z.string(), image: z.string(), imageAlt: z.string(), order: z.number(),
    tags: z.array(z.string()),
  }),
});
const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '*.md' }),
  schema: z.object({
    title: z.string(), date: z.coerce.date().nullable(),
    datePrecision: z.enum(['day', 'month', 'year', 'unknown']),
    sourceOrder: z.number(), image: z.string().nullable(),
  }),
});
export const collections = { research, news };
