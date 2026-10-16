import { z } from "zod";

export const AmountKeypadPropsSchema = z.object({
  max: z.number().positive().finite(),
  initialValue: z.string().optional(),
  currencySymbol: z.string().default("$"),
  accountLabel: z.string().default("Account Card"),
  ctaLabel: z.string().default("Continue"),
});

export type AmountKeypadSchemaProps = z.input<typeof AmountKeypadPropsSchema>;

export const KeyPressSchema = z.enum([
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "backspace",
]);
export type KeyPress = z.infer<typeof KeyPressSchema>;
