/**
 * ORAL HISTORY METADATA SCHEMAS
 * ==============================
 *
 * Strict TypeScript/Zod schemas for OralHistory JSON fields
 * Questions and keywords arrays with structured validation
 */

import { z } from 'zod';

// =============================================
// INTERVIEW QUESTION SCHEMAS
// =============================================

/**
 * Individual interview question with metadata
 */
export const InterviewQuestionSchema = z
  .object({
    /** Question text content */
    text: z.string().trim().min(1).max(2000),

    /** Timestamp in audio/video (HH:MM:SS or seconds) */
    timestamp: z.string().trim().max(20).optional(),

    /** Question order/sequence number */
    order: z.number().int().positive(),

    /** Question category/theme */
    category: z.string().trim().max(100).optional(),

    /** Interviewer who asked the question */
    askedBy: z.string().trim().max(200).optional(),

    /** Response duration in seconds */
    responseDuration: z.number().positive().optional(),

    /** Question importance/priority */
    priority: z.enum(['low', 'medium', 'high']).optional(),

    /** Notes about the question/response */
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

/**
 * Simple question - just text and order
 */
export const SimpleQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    order: z.number().int().positive(),
  })
  .strict();

/**
 * Questions array schema - for complex question objects
 */
export const QuestionsArraySchema = z.array(InterviewQuestionSchema);

/**
 * Simple questions array - for basic question strings
 */
export const SimpleQuestionsArraySchema = z.array(z.string().trim().min(1).max(2000));

// =============================================
// KEYWORD/TAG SCHEMAS
// =============================================

/**
 * Structured keyword with metadata
 */
export const KeywordSchema = z
  .object({
    /** Keyword/tag text */
    term: z.string().trim().min(1).max(200),

    /** Keyword category/type */
    category: z
      .enum([
        'person',
        'place',
        'event',
        'organization',
        'concept',
        'time_period',
        'theme',
        'other',
      ])
      .optional(),

    /** Keyword confidence/relevance (0-1) */
    confidence: z.number().min(0).max(1).optional(),

    /** Source of keyword (manual, ai, automatic) */
    source: z.enum(['manual', 'ai', 'automatic']).optional(),

    /** Timestamp when keyword was added */
    addedAt: z.string().datetime().optional(),

    /** User who added the keyword */
    addedBy: z.string().trim().max(100).optional(),

    /** External URI for linked data */
    uri: z.string().url().optional(),
  })
  .strict();

/**
 * Keywords array schema - for structured keyword objects
 */
export const KeywordsArraySchema = z.array(KeywordSchema);

/**
 * Simple keywords array - for basic keyword strings
 */
export const SimpleKeywordsArraySchema = z.array(z.string().trim().min(1).max(200));

// =============================================
// INTERVIEW METADATA SCHEMAS
// =============================================

/**
 * Interview participant information
 */
export const ParticipantSchema = z
  .object({
    /** Participant name or identifier */
    name: z.string().trim().min(1).max(200),

    /** Participant role */
    role: z.enum(['interviewee', 'interviewer', 'observer', 'translator']),

    /** Age at time of interview */
    ageAtInterview: z.number().int().positive().max(150).optional(),

    /** Birth year */
    birthYear: z.number().int().min(1850).max(2050).optional(),

    /** Gender */
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),

    /** Occupation/profession */
    occupation: z.string().trim().max(200).optional(),

    /** Relationship to main topic */
    relationship: z.string().trim().max(500).optional(),

    /** Additional participant notes */
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

/**
 * Interview session metadata
 */
export const InterviewSessionSchema = z
  .object({
    /** Interview date */
    date: z.string().trim().min(1),

    /** Interview location */
    location: z.string().trim().max(500).optional(),

    /** Interview duration in seconds */
    duration: z.number().positive().optional(),

    /** Interview language(s) */
    languages: z.array(z.string().trim().min(2).max(10)),

    /** Recording quality assessment */
    recordingQuality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),

    /** Audio/video equipment used */
    equipment: z.string().trim().max(500).optional(),

    /** Participants in the interview */
    participants: z.array(ParticipantSchema).optional(),

    /** Interview format/style */
    format: z
      .enum([
        'structured',
        'semi_structured',
        'unstructured',
        'life_history',
        'thematic',
        'group_interview',
      ])
      .optional(),

    /** Consent and permissions */
    consent: z
      .object({
        recordingConsent: z.boolean(),
        publicUseConsent: z.boolean(),
        researchUseConsent: z.boolean(),
        consentForm: z.string().trim().max(200).optional(),
      })
      .optional(),
  })
  .strict();

// =============================================
// COMPLETE ORAL HISTORY METADATA
// =============================================

/**
 * Extended oral history metadata schema
 */
export const ExtendedOralHistoryMetadataSchema = z
  .object({
    /** Structured interview questions */
    structuredQuestions: QuestionsArraySchema.optional(),

    /** Structured keywords/tags */
    structuredKeywords: KeywordsArraySchema.optional(),

    /** Interview session information */
    session: InterviewSessionSchema.optional(),

    /** Transcript information */
    transcript: z
      .object({
        available: z.boolean(),
        language: z.string().trim().max(10).optional(),
        format: z.enum(['text', 'srt', 'vtt', 'word']).optional(),
        accuracy: z.number().min(0).max(1).optional(),
        transcribedBy: z.string().trim().max(100).optional(),
        transcribedAt: z.string().datetime().optional(),
      })
      .optional(),

    /** Cultural/historical context */
    context: z
      .object({
        historicalPeriod: z.string().trim().max(200).optional(),
        culturalBackground: z.string().trim().max(500).optional(),
        geographicalContext: z.string().trim().max(500).optional(),
        socialContext: z.string().trim().max(500).optional(),
      })
      .optional(),

    /** Rights and permissions */
    rights: z
      .object({
        copyright: z.string().trim().max(200).optional(),
        license: z.string().trim().max(200).optional(),
        restrictions: z.string().trim().max(1000).optional(),
        embargoDate: z.string().trim().max(20).optional(),
      })
      .optional(),
  })
  .strict();

// =============================================
// TYPE EXPORTS
// =============================================

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type SimpleQuestion = z.infer<typeof SimpleQuestionSchema>;
export type QuestionsArray = z.infer<typeof QuestionsArraySchema>;
export type SimpleQuestionsArray = z.infer<typeof SimpleQuestionsArraySchema>;
export type Keyword = z.infer<typeof KeywordSchema>;
export type KeywordsArray = z.infer<typeof KeywordsArraySchema>;
export type SimpleKeywordsArray = z.infer<typeof SimpleKeywordsArraySchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type InterviewSession = z.infer<typeof InterviewSessionSchema>;
export type ExtendedOralHistoryMetadata = z.infer<typeof ExtendedOralHistoryMetadataSchema>;

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Validates questions array against available schemas (simple or structured)
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns valid InterviewQuestion[] or string[], throws on invalid data
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate as questions array
 * @returns Validated questions array (structured or simple)
 */
export const validateQuestions = (data: unknown): InterviewQuestion[] | string[] => {
  const structuredResult = QuestionsArraySchema.safeParse(data);

  if (structuredResult.success) {
    return structuredResult.data;
  }

  return SimpleQuestionsArraySchema.parse(data);
};

/**
 * Validates keywords array against available schemas (simple or structured)
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns valid Keyword[] or string[], throws on invalid data
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate as keywords array
 * @returns Validated keywords array (structured or simple)
 */
export const validateKeywords = (data: unknown): Keyword[] | string[] => {
  const structuredResult = KeywordsArraySchema.safeParse(data);

  if (structuredResult.success) {
    return structuredResult.data;
  }

  return SimpleKeywordsArraySchema.parse(data);
};

/**
 * Creates a structured question from simple text with automatic ordering
 *
 * Preconditions: text is non-empty string, order is positive integer
 * Postconditions: returns valid InterviewQuestion with text and order
 * Invariants: text is trimmed, order is preserved
 *
 * @param text - Question text content
 * @param order - Question sequence number
 * @returns Structured InterviewQuestion object
 */
export const createQuestionFromText = (text: string, order: number): InterviewQuestion => {
  return InterviewQuestionSchema.parse({
    text: text.trim(),
    order,
  });
};

/**
 * Creates a structured keyword from simple text with current timestamp
 *
 * Preconditions: term is non-empty string, category is valid enum or undefined
 * Postconditions: returns valid Keyword with term, category, and metadata
 * Invariants: term is trimmed, current timestamp added, source set to manual
 *
 * @param term - Keyword term text
 * @param category - Optional keyword category
 * @returns Structured Keyword object
 */
export const createKeywordFromText = (term: string, category?: Keyword['category']): Keyword => {
  return KeywordSchema.parse({
    term: term.trim(),
    category,
    source: 'manual',
    addedAt: new Date().toISOString(),
  });
};

/**
 * Converts simple string arrays to structured format with proper ordering
 *
 * Preconditions: questions and keywords are arrays of strings
 * Postconditions: returns structured objects with proper order and metadata
 * Invariants: original arrays not mutated, order preserved for questions
 *
 * @param questions - Array of question text strings
 * @param keywords - Array of keyword strings
 * @returns Object with structured questions and keywords arrays
 */
export const upgradeToStructuredFormat = (
  questions: string[],
  keywords: string[],
): { questions: InterviewQuestion[]; keywords: Keyword[] } => {
  const structuredQuestions = questions.map((text, index) =>
    createQuestionFromText(text, index + 1),
  );

  const structuredKeywords = keywords.map((term) => createKeywordFromText(term));

  return {
    questions: structuredQuestions,
    keywords: structuredKeywords,
  };
};
