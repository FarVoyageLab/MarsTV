import { Link } from "react-router";

export function DoubanPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 text-5xl">🚧</div>
      <h1 className="mb-3 text-2xl font-semibold">豆瓣片单</h1>
      <p className="mb-8 max-w-md text-sm leading-6 text-muted-foreground">
        发现高分影视内容
      </p>
      <Link
        to="/"
        className="glass-button inline-flex items-center rounded-full px-5 py-2 text-sm font-medium transition-all hover:bg-primary/20"
      >
        返回首页
      </Link>
    </div>
  );
}
