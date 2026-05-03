import { LoginForm } from "@marstv/ui";
import { useNavigate } from "react-router";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <LoginForm onLoginSuccess={() => navigate("/")} />
      </div>
    </div>
  );
}
