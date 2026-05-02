import { createApiClient, login } from "@marstv/api";
import { LoginForm } from "@marstv/ui";
import { useState } from "react";
import { useNavigate } from "react-router";

const api = createApiClient("");

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <LoginForm
          onSubmit={async (password) => {
            try {
              await login(api, password);
              navigate("/");
            } catch (err) {
              setError(err instanceof Error ? err.message : "登录失败");
            }
          }}
          error={error}
        />
      </div>
    </div>
  );
}
