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

const optionalSurveyDate = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.date().nullable(),
);

export const surveySettingsSchema = z.object({
  title: z.string().trim().max(200, "설문 제목은 200자 이내로 입력해주세요."),
  description: z.string().trim().max(1_000, "설문 소개는 1,000자 이내로 입력해주세요."),
  externalUrl: z.union([httpsUrlSchema, z.literal("")]),
  isActive: z.boolean(),
  startsAt: optionalSurveyDate,
  endsAt: optionalSurveyDate,
}).strict().superRefine((data, context) => {
  const hasStart = data.startsAt !== null;
  const hasEnd = data.endsAt !== null;
  if (hasStart !== hasEnd) {
    const message = "설문 시작일과 종료일은 함께 입력해주세요.";
    if (!hasStart) context.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message });
    if (!hasEnd) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message });
  }
  if (hasStart && hasEnd && data.endsAt!.getTime() <= data.startsAt!.getTime()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "설문 종료일은 시작일보다 늦어야 합니다.",
    });
  }
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

export type SurveyStatus = "inactive" | "upcoming" | "active" | "ended";

export function getSurveyStatus(
  settings: Pick<SurveySettingsInput, "isActive" | "startsAt" | "endsAt">,
  now = new Date(),
): SurveyStatus {
  if (!settings.isActive) return "inactive";
  const startsAt = settings.startsAt ? new Date(settings.startsAt) : null;
  const endsAt = settings.endsAt ? new Date(settings.endsAt) : null;
  if (startsAt && now < startsAt) return "upcoming";
  if (endsAt && now >= endsAt) return "ended";
  return "active";
}

export function isSurveyVisible(
  settings: Pick<SurveySettingsInput, "isActive" | "startsAt" | "endsAt">,
  now = new Date(),
): boolean {
  return getSurveyStatus(settings, now) === "active";
}