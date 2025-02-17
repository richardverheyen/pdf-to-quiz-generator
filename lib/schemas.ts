import { z } from "zod";

export const categoryScoreSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Score out of 100 for this category"),
  analysis: z
    .string()
    .min(1)
    .describe("Detailed analysis of the match for this category"),
  suggestion: z
    .string()
    .min(1)
    .describe("Specific suggestions for improvement"),
  matchedKeywords: z
    .array(z.string())
    .describe("Keywords that were found in both the resume and job posting"),
  missingKeywords: z
    .array(z.string())
    .describe(
      "Important keywords from the job posting that were not found in the resume"
    ),
});

export const atsSchema = z.object({
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall match score between resume and job posting"),
  summary: z.string().min(1).describe("Executive summary of the overall match"),
  categories: z.object({
    hardSkills: categoryScoreSchema.describe(
      "Technical skills, tools, and specific knowledge"
    ),
    softSkills: categoryScoreSchema.describe(
      "Interpersonal and transferable skills"
    ),
    experience: categoryScoreSchema.describe(
      "Work history and relevant experience"
    ),
    education: categoryScoreSchema.describe(
      "Educational background and qualifications"
    ),
    industryFit: categoryScoreSchema.describe(
      "Industry-specific terminology and requirements"
    ),
  }),
  formatting: z.object({
    issues: z
      .array(z.string())
      .describe("Any formatting issues that could affect ATS parsing"),
    suggestions: z
      .array(z.string())
      .describe("Suggestions for improving resume format"),
  }),
  generalSuggestions: z
    .array(z.string())
    .describe("Overall suggestions for improving resume-job match"),
});

export type ATSAnalysis = z.infer<typeof atsSchema>;
export type CategoryScore = z.infer<typeof categoryScoreSchema>;

export const questionSchema = z.object({
  question: z.string(),
  options: z
    .array(z.string())
    .length(4)
    .describe(
      "Four possible answers to the question. Only one should be correct. They should all be of equal lengths."
    ),
  answer: z
    .enum(["A", "B", "C", "D"])
    .describe(
      "The correct answer, where A is the first option, B is the second, and so on."
    ),
});

export type Question = z.infer<typeof questionSchema>;

export const questionsSchema = z.array(questionSchema).length(4);
