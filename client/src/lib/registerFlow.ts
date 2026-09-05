import { ApiRequestError } from "@/lib/queryClient";
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  type RegistrationConsentInput,
} from "@shared/policies";

export const DEFAULT_REGISTER_ERROR = "회원가입 중 오류가 발생했습니다.";

export interface RegisterCompanyData {
  companyName: string;
  business: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface RegisterSubmissionData {
  name: string;
  email: string;
  password: string;
  weixin?: string;
  companyName?: string;
  business?: string;
  contactEmail?: string;
  contactPhone?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}

export type RegisterUser = (
  name: string,
  email: string,
  password: string,
  userType: "staff" | "company",
  companyData?: RegisterCompanyData,
  weixin?: string,
  consents?: RegistrationConsentInput,
) => Promise<void>;

export interface RegisterToast {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

interface SubmitRegistrationOptions {
  data: RegisterSubmissionData;
  userType: "staff" | "company";
  registerUser: RegisterUser;
  toast: (toast: RegisterToast) => unknown;
  setLocation: (location: string) => unknown;
  setFieldError?: (
    field: "companyName" | "business",
    message: string,
  ) => unknown;
}

export function getRegisterErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return DEFAULT_REGISTER_ERROR;
  }

  const responseBody = error.responseBody;
  if (
    responseBody !== null &&
    typeof responseBody === "object" &&
    "message" in responseBody &&
    typeof responseBody.message === "string" &&
    responseBody.message.trim()
  ) {
    return responseBody.message;
  }

  return DEFAULT_REGISTER_ERROR;
}

export async function submitRegistration({
  data,
  userType,
  registerUser,
  toast,
  setLocation,
  setFieldError,
}: SubmitRegistrationOptions): Promise<boolean> {
  if (userType === "company") {
    const companyErrors: Array<{
      field: "companyName" | "business";
      message: string;
    }> = [];

    if (!data.companyName || data.companyName.length < 2) {
      companyErrors.push({
        field: "companyName",
        message: "회사명은 2자 이상이어야 합니다",
      });
    }
    if (!data.business || data.business.length < 2) {
      companyErrors.push({
        field: "business",
        message: "사업 내용을 입력해주세요",
      });
    }

    if (companyErrors.length > 0) {
      for (const { field, message } of companyErrors) {
        setFieldError?.(field, message);
      }
      return false;
    }
  }

  const consents: RegistrationConsentInput | undefined = data.termsAccepted === true && data.privacyAccepted === true
    ? {
        terms: {
          agreed: true as const,
          policyVersion: CURRENT_TERMS_VERSION as typeof CURRENT_TERMS_VERSION,
          purpose: "account_terms" as const,
        },
        privacy: {
          agreed: true as const,
          policyVersion: CURRENT_PRIVACY_POLICY_VERSION as typeof CURRENT_PRIVACY_POLICY_VERSION,
          purpose: "account_privacy" as const,
        },
      }
    : undefined;
  const consentArgs = consents ? [consents] as const : [];

  try {
    if (userType === "company") {
      await registerUser(
        data.name,
        data.email,
        data.password,
        "company",
        {
          companyName: data.companyName!,
          business: data.business!,
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
        },
        data.weixin || undefined,
        ...consentArgs,
      );
    } else {
      await registerUser(
        data.name,
        data.email,
        data.password,
        "staff",
        undefined,
        data.weixin || undefined,
        ...consentArgs,
      );
    }

    toast({
      title: "회원가입 성공",
      description: "환영합니다! 계정이 생성되었습니다.",
    });
    setLocation("/dashboard");
    return true;
  } catch (error) {
    toast({
      title: "회원가입 실패",
      description: getRegisterErrorMessage(error),
      variant: "destructive",
    });
    return false;
  }
}