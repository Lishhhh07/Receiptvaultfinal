import { z } from "zod";

const dateRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;

export const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().default(1),
  unit_price: z.number(),
  total_price: z.number(),
});

export const ReceiptSchema = z.object({
  store_name: z.string().default("Unknown Store"),
  purchase_date: z
    .string()
    .nullable()
    .default(null)
    .refine((val) => val === null || dateRegex.test(val), {
      message: "purchase_date must be in DD/MM/YYYY or YYYY-MM-DD format",
    }),
  total_amount: z.number().positive(),
  currency: z.string().default("INR"),
  items: z.array(ReceiptItemSchema).default([]),
  return_deadline_days: z.number().nullable().default(null),
  warranty_period_days: z.number().nullable().default(null),
  payment_method: z.string().nullable().default(null),
  raw_text: z.string().default(""),
  date_inferred: z.boolean().default(false),
});

export type Receipt = z.infer<typeof ReceiptSchema>;
export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;
