/**
 * Gemini model sabitleri — TEK KAYNAK.
 * Kural: en ucuz çalışan model dışında hiçbir model kullanılmaz.
 *
 * İstenen gemini-2.5-flash-lite ($0.10/$0.40) bu anahtara Google tarafından
 * kapatıldı (404 "no longer available to new users"). Çalışan en ucuz kademe
 * gemini-3.1-flash-lite ($0.125 giriş / $0.750 çıkış, 1M token) — 3.5-flash-lite'ın
 * çıkışta ~1/3'ü. Buradan başka modele geçmek maliyeti katlar.
 *
 * Model değişimi GEREKİRSE yalnızca bu dosya düzenlenir.
 */
export const CHAT_MODEL = "gemini-3.1-flash-lite";

/** Embedding: 768 boyut (pgvector şeması bununla uyumlu — migration 0004). */
export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIM = 768;
