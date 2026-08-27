import { ApiRequestError } from "@/lib/queryClient";

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
}

export type RegisterUser = (
  name: string,
  email: string,
  password: string,
  userType: "staff" | "company",
  companyData?: RegisterCompanyData,
  weixin?: string,
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
}: SubmitRegistrationOptions): Promise<boolean> {
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
      );
    } else {
      await registerUser(
        data.name,
        data.email,
        data.password,
        "staff",
        undefined,
        data.weixin || undefined,
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