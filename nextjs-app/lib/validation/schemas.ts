import { z } from "zod";
import { MAX_FLAG_REASON_LENGTH, MAX_MESSAGE_LENGTH } from "@/lib/security/tokenLimiter";

const currentYear = new Date().getFullYear();

const isoDateOptional = z
  .string()
  .optional()
  .refine((val) => !val || !Number.isNaN(Date.parse(val)), {
    message: "Invalid date",
  });

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  birth_year: z
    .number()
    .int()
    .min(currentYear - 110, "Enter a valid birth year")
    .max(currentYear, "Enter a valid birth year"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const birthYearSchema = z.object({
  birth_year: z
    .number()
    .int()
    .min(currentYear - 110, "Enter a valid birth year")
    .max(currentYear, "Enter a valid birth year"),
});

export const followUpMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message can't be empty")
    .max(MAX_MESSAGE_LENGTH, "Message is too long"),
});

export const solveHistoryQuerySchema = z
  .object({
    topic: z.string().trim().optional(),
    from: isoDateOptional,
    to: isoDateOptional,
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  })
  .refine(
    (data) => !data.from || !data.to || new Date(data.from) <= new Date(data.to),
    { message: "`from` must be before `to`", path: ["from"] }
  );

export const flagSolveSchema = z.object({
  reason: z.string().trim().max(MAX_FLAG_REASON_LENGTH, "Reason is too long").optional(),
});

export const checkoutRequestSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

export const adminFlagUpdateSchema = z.object({
  status: z.enum(["resolved", "escalated"]),
  reviewer_notes: z.string().trim().max(2000, "Notes are too long").optional(),
});

export const adminFlaggedSolvesQuerySchema = z.object({
  status: z.enum(["open", "resolved", "escalated"]).optional().default("open"),
  cursor: z.string().optional(),
});
