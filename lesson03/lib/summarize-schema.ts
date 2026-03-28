import { z } from "zod"

export const summarizeStartRequestSchema = z.object({
  url: z.string().min(1),
})

export const summarizeStatusRequestSchema = z.object({
  jobToken: z.string().min(1),
})

export const summarizeMetaSchema = z.object({
  source: z.literal("youtube"),
  lang: z.string().optional(),
  availableLangs: z.array(z.string()).optional(),
})

export const summarizeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export const summarizeProcessingResponseSchema = z.object({
  status: z.literal("processing"),
  jobToken: z.string().optional(),
})

export const summarizeCompletedResponseSchema = z.object({
  status: z.literal("completed"),
  summary: z.string(),
  meta: summarizeMetaSchema.optional(),
})

export const summarizeErrorResponseSchema = z.object({
  status: z.literal("error"),
  error: summarizeErrorSchema,
})

export const summarizeResponseSchema = z.discriminatedUnion("status", [
  summarizeProcessingResponseSchema,
  summarizeCompletedResponseSchema,
  summarizeErrorResponseSchema,
])

export type SummarizeStartRequest = z.infer<typeof summarizeStartRequestSchema>
export type SummarizeStatusRequest = z.infer<typeof summarizeStatusRequestSchema>
export type SummarizeMeta = z.infer<typeof summarizeMetaSchema>
export type SummarizeError = z.infer<typeof summarizeErrorSchema>
export type SummarizeProcessingResponse = z.infer<typeof summarizeProcessingResponseSchema>
export type SummarizeCompletedResponse = z.infer<typeof summarizeCompletedResponseSchema>
export type SummarizeErrorResponse = z.infer<typeof summarizeErrorResponseSchema>
export type SummarizeResponse = z.infer<typeof summarizeResponseSchema>
