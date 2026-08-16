// Normalizes Arabic text for exact-match duplicate-dua detection. Distinct
// from normalizeForSearch (src/lib/search.ts), which handles Latin-script
// transliteration spelling variance for fuzzy search on a different field —
// this normalizes the Arabic script itself so that diacritics, letter-form
// variants, and stray characters that don't change what dua it is don't
// defeat an exact-string comparison.
//
// Rule set verified against Apache Lucene's ArabicNormalizer (the standard
// reference implementation, also used by Elasticsearch's Arabic analyzer),
// plus one app-specific addition for Quranic annotation marks. See
// https://github.com/arshali2774/DuaVault/issues/42 for the full research
// trail. Codepoints are spelled out explicitly (rather than as literal
// combining characters in source) so the mapping is unambiguous to read.

// Alef with madda above (U+0622), alef with hamza above (U+0623), alef with
// hamza below (U+0625) -> bare alef (U+0627). Hamza-on-waw (U+0624) and
// hamza-on-yeh (U+0626) are deliberately left untouched — Lucene's
// normalizer only unifies the alef-seated forms, not every hamza carrier.
const ALEF_VARIANTS = /[آأإ]/g;
const ALEF = "ا";

// Teh marbuta (U+0629) -> heh (U+0647).
const TEH_MARBUTA = /ة/g;
const HEH = "ه";

// Dotless yeh / alef maksura (U+0649) -> yeh (U+064A).
const ALEF_MAKSURA = /ى/g;
const YEH = "ي";

// Harakat/diacritics: fathatan, dammatan, kasratan, fatha, damma, kasra,
// shadda, sukun (U+064B-U+0652).
const HARAKAT = /[ً-ْ]/g;

// Tatweel/kashida (U+0640).
const TATWEEL = /ـ/g;

// Quranic annotation marks (small pause/waqf signs and the end-of-ayah
// mark, U+06D6-U+06ED) that can appear when a dua's Arabic text is
// transcribed from a mushaf source. Not part of Lucene's general-purpose
// baseline; carries no bearing on which dua the text is.
const QURANIC_ANNOTATIONS = /[ۖ-ۭ]/g;

export function normalizeArabicText(text: string): string {
  return text
    .normalize("NFC")
    .replace(ALEF_VARIANTS, ALEF)
    .replace(TEH_MARBUTA, HEH)
    .replace(ALEF_MAKSURA, YEH)
    .replace(HARAKAT, "")
    .replace(TATWEEL, "")
    .replace(QURANIC_ANNOTATIONS, "")
    .replace(/\s+/g, " ")
    .trim();
}
