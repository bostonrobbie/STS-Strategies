import { z } from "zod";
import { TRADINGVIEW } from "../constants";

// ============================================
// USER SCHEMAS
// ============================================

export const tradingViewUsernameSchema = z
  .string()
  .min(
    TRADINGVIEW.USERNAME_MIN_LENGTH,
    `Username must be at least ${TRADINGVIEW.USERNAME_MIN_LENGTH} characters`
  )
  .max(
    TRADINGVIEW.USERNAME_MAX_LENGTH,
    `Username must be at most ${TRADINGVIEW.USERNAME_MAX_LENGTH} characters`
  )
  .regex(
    TRADINGVIEW.USERNAME_PATTERN,
    "Username can only contain letters, numbers, underscores, and hyphens"
  );

export const onboardingSchema = z.object({
  tradingViewUsername: tradingViewUsernameSchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
  acceptDisclaimer: z.literal(true, {
    errorMap: () => ({
      message: "You must acknowledge the risk disclaimer",
    }),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const updateUserSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

// ============================================
// SUPPORT SCHEMAS
// ============================================

export const createTicketSchema = z.object({
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be at most 200 characters"),
  message: z
    .string()
    .min(20, "Message must be at least 20 characters")
    .max(5000, "Message must be at most 5000 characters"),
  category: z
    .enum(["access", "billing", "technical", "other"])
    .optional()
    .default("other"),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const createTicketMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be at most 5000 characters"),
});

export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;

// ============================================
// ADMIN SCHEMAS
// ============================================

export const updateTicketStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "WAITING_ON_CUSTOMER",
    "RESOLVED",
    "CLOSED",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

export const adminTicketReplySchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be at most 5000 characters"),
  isInternal: z.boolean().optional().default(false),
});

export type AdminTicketReplyInput = z.infer<typeof adminTicketReplySchema>;

export const createStrategySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  description: z.string().min(10).max(500),
  longDescription: z.string().max(5000).optional(),
  pineId: z
    .string()
    .min(1)
    .regex(/^PUB;/, "Pine ID must start with 'PUB;'"),
  market: z.string().min(1).max(20),
  timeframe: z.string().min(1).max(10),
  style: z.string().min(1).max(50),
  sessionFocus: z.string().max(100).optional(),
  features: z.array(z.string().max(200)).max(10).optional(),
  imageUrl: z.string().url().optional().nullable(),
  autoProvision: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;

export const updateStrategySchema = createStrategySchema.partial();

export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;

// ============================================
// CONTACT SCHEMAS
// ============================================

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be at most 200 characters"),
  message: z
    .string()
    .min(20, "Message must be at least 20 characters")
    .max(5000, "Message must be at most 5000 characters"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

// ============================================
// PAGINATION SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const searchSchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;
