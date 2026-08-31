import { z } from "zod";

const httpsUrlSchema = z.string()
  .trim()
  .url("유효한 설문 링크를 입력해주세요.")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "설문 링크는 HTTPS 주소여야 합니다.");

export const surveySettingsSchema = z.object({
  title: z.string().trim().max(200, "설문 제목은 200자 이내로 입력해주세요."),
  description: z.string().trim().max(1_000, "설문 소개는 1,000자 이내로 입력해주세요."),
  externalUrl: z.union([httpsUrlSchema, z.literal("")]),
  isActive: z.boolean(),
}).strict().superRefine((data, context) => {
  if (!data.isActive) return;
  if (!data.title) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["title"], message: "활성 설문에는 제목이 필요합니다." });
  }
  if (!data.description) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["description"], message: "활성 설문에는 소개가 필요합니다." });
  }
  if (!data.externalUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["externalUrl"], message: "활성 설문에는 설문 링크가 필요합니다." });
  }
});

export type SurveySettingsInput = z.infer<typeof surveySettingsSchema>;