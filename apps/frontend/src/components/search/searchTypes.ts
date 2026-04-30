import { DocumentMetadata } from '@memoriaali/api-types/schemas';

/**
 * Strongly-typed document type alias
 */
export type DocType = NonNullable<DocumentMetadata['type']>;

/**
 * Canonical list of document types
 */
export const documentTypes: DocType[] = [
  'article',
  'book',
  'document',
  'drawing',
  'photo',
  'letter',
  'map',
  'memoir',
  'object',
  'other',
  'postcard',
  'recording',
  'text',
  'video',
];

/**
 * Mapping keys used with next-intl translations. Components call `t(typeLabelKeys[type])`.
 */
export const typeLabelKeys: Record<DocType, string> = {
  object: 'typeObject',
  article: 'typeArticle',
  map: 'typeMap',
  video: 'typeVideo',
  text: 'typeText',
  document: 'typeDocument',
  book: 'typeBook',
  photo: 'typePhoto',
  memoir: 'typeMemoir',
  letter: 'typeLetter',
  recording: 'typeRecording',
  postcard: 'typePostcard',
  drawing: 'typeDrawing',
  other: 'typeOther',
};

export type LanguageCode = 'en' | 'fi' | 'sv';

export const languageLabelKeys: Record<LanguageCode, string> = {
  en: 'languageEnglish',
  fi: 'languageFinnish',
  sv: 'languageSwedish',
};

export const languages: LanguageCode[] = ['en', 'fi', 'sv'];
