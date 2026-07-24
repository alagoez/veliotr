import { z } from "zod";

const range = z.object({
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
}).refine((value) => value.min === undefined || value.max === undefined || value.min <= value.max, {
  message: "Minimum değer maksimumdan büyük olamaz",
});

export const SearchRequestSchema = z.object({
  filters: z.object({
    q: z.string().trim().max(120).optional(),
    niche: z.string().trim().max(50).optional(),
    isShort: z.boolean().optional(),
    datePreset: z.enum(["today", "this-week", "last-week", "this-month", "last-month", "all"]).optional(),
    multiplier: range.optional(), views: range.optional(), subscribers: range.optional(),
    durationSec: range.optional(), viewsToSubs: range.optional(), medianViews: range.optional(),
    channelTotalViews: range.optional(), channelVideoCount: range.optional(), likes: range.optional(),
    comments: range.optional(), engagement: range.optional(), channelAgeYears: range.optional(),
    includeKeywords: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
    excludeKeywords: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
    excludeChannels: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  }).default({}),
  sort: z.enum(["outlier", "upload-date", "relevance"]).default("outlier"),
  page: z.number().int().min(0).max(10_000).default(0),
  pageSize: z.number().int().min(6).max(48).default(24),
  seed: z.number().int().optional(),
});

export const ChatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "model"]), content: z.string().trim().min(1).max(4_000) })).min(1).max(24),
  niche: z.string().trim().max(50).optional(),
  folderVideos: z.array(z.object({
    id: z.string().max(100),
    channelId: z.string().max(100),
    channelTitle: z.string().max(200),
    channelHandle: z.string().max(200),
    subscribers: z.number().finite().nonnegative(),
    medianViews: z.number().finite().nonnegative(),
    nicheSlug: z.string().max(80),
    title: z.string().max(500),
    thumbUrl: z.string().url().nullable(),
    publishedAt: z.string().datetime(),
    durationSec: z.number().int().nonnegative(),
    isShort: z.boolean(),
    views: z.number().finite().nonnegative(),
    likes: z.number().finite().nonnegative(),
    comments: z.number().finite().nonnegative(),
    engagement: z.number().finite().nonnegative(),
    outlierScore: z.number().finite().nonnegative(),
    viewsPerDay: z.number().finite().nonnegative(),
    viewsToSubs: z.number().finite().nonnegative(),
  })).max(20).optional(),
});

export const CheckoutRequestSchema = z.object({ plan: z.enum(["monthly", "annual"]).default("monthly") });
