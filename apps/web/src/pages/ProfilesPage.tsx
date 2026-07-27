import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, LockKeyhole, Plus, Shield, UserRound } from "lucide-react";
import { api } from "../lib/runtime";

const initialProfiles = [
  { id: "1", name: "管理员", role: "Owner", kind: "adult", avatar: "M" },
  { id: "2", name: "家庭成员", role: "Member", kind: "adult", avatar: "F" },
  { id: "3", name: "儿童档案", role: "Child · PG", kind: "child", avatar: "K" }
];

export function ProfilesPage() {
  const queryClient = useQueryClient();
  const remote = useQuery({
    queryKey: ["profiles"],
    queryFn: () => api.profiles(),
    retry: 1
  });
  const [localProfiles, setLocalProfiles] = useState(initialProfiles);
  const profiles = remote.data?.map((profile) => ({
    id: profile.id,
    name: profile.name,
    role: profile.kind === "child" ? `Child · ${profile.rating_limit ?? "PG"}` : "Member",
    kind: profile.kind,
    avatar: profile.avatar_key.slice(0, 1).toUpperCase() || "M"
  })) ?? localProfiles;
  const create = useMutation({
    mutationFn: () => api.createProfile({
      name: `新档案 ${profiles.length + 1}`,
      kind: "adult",
      avatarKey: "N"
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
    onError: () => setLocalProfiles((items) => [...items, {
      id: crypto.randomUUID(),
      name: `新档案 ${items.length + 1}`,
      role: "Member",
      kind: "adult",
      avatar: "N"
    }])
  });

  return (
    <div className="standard-page">
      <header className="page-heading">
        <div><h1>家庭档案</h1><p>角色、内容等级和儿童 PIN 在所有已配对设备间同步。</p></div>
        <button
          className="button button--primary"
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        ><Plus /> 添加档案</button>
      </header>
      <div className="profile-list">
        {profiles.map((profile) => (
          <article key={profile.id}>
            <div className={`profile-avatar profile-avatar--${profile.kind}`}>{profile.avatar}</div>
            <div><h2>{profile.name}</h2><p>{profile.role}</p></div>
            <span>{profile.kind === "child" ? <><Baby /> 家长控制已启用</> : <><UserRound /> 完整内容</>}</span>
            <button type="button" className="text-button">管理</button>
          </article>
        ))}
      </div>
      <section className="policy-strip">
        <Shield aria-hidden="true" />
        <div><h2>家庭安全策略</h2><p>儿童档案默认隐藏未评级内容，退出档案和修改来源需要管理员 PIN。</p></div>
        <button className="button button--secondary" type="button"><LockKeyhole /> 设置 PIN</button>
      </section>
    </div>
  );
}
