import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { parseWechatCallback } from "@/lib/wechatLogin";

export default function WechatCallbackPage() {
  const [, setLocation] = useLocation();
  const { completeWechatLogin } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callback = parseWechatCallback(window.location.search);
    if ("error" in callback) {
      setError("WeChat 인증이 취소되었거나 유효하지 않습니다. 다시 시도해주세요.");
      return;
    }

    completeWechatLogin(callback.code)
      .then(() => setLocation("/dashboard"))
      .catch(() => {
        setError("WeChat 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      });
  }, [completeWechatLogin, setLocation]);

  useEffect(() => {
    if (!error) return;
    toast({
      title: "WeChat 로그인 실패",
      description: error,
      variant: "destructive",
    });
  }, [error, toast]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {error ? "WeChat 로그인 실패" : "WeChat 로그인 처리 중..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          {error || "잠시만 기다려주세요."}
        </CardContent>
      </Card>
    </div>
  );
}