"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type DemoUser } from "@/lib/api";
import Link from "next/link";
type Identity = { userId: string; setUserId: (id: string) => void };
const IdentityContext = createContext<Identity>({ userId: "", setUserId: () => {} });
export const useIdentity = () => useContext(IdentityContext);
function IdentityProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [userId, setUser] = useState("");
  const users = useQuery({ queryKey: ["users"], queryFn: ({ signal }) => api<DemoUser[]>("/users", { signal }) });
  useEffect(() => { if (!users.data?.length) return; const saved = localStorage.getItem("demo-user"); setUser(users.data.some((user) => user.id === saved) ? saved! : users.data[0].id); }, [users.data]);
  function setUserId(id: string) {
    if (id === userId) return;
    void queryClient.cancelQueries({ predicate: (query) => query.queryKey[0] === "private" });
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "private" });
    localStorage.setItem("demo-user", id); setUser(id);
  }
  return <IdentityContext.Provider value={{ userId, setUserId }}><header className="topbar"><Link className="brand" href="/" aria-label="拾光素材，返回首页"><span className="brand-mark">✳</span><span>拾光素材<small>STUDIO</small></span></Link><nav aria-label="主导航"><Link className="active" href="/">发现模板</Link><span className="nav-disabled">我的作品 <small>即将开放</small></span></nav><div className="account"><span className="avatar" aria-hidden="true">{userId === "demo-b" ? "B" : "A"}</span><label className="sr-only" htmlFor="demo-user">切换演示用户</label>{users.isError ? <button className="retry-small" onClick={() => users.refetch()}>用户加载失败，重试</button> : <select id="demo-user" value={userId} disabled={!userId} onChange={(event) => setUserId(event.target.value)}><option value="" disabled>加载用户中</option>{users.data?.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select>}</div></header>{children}</IdentityContext.Provider>;
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } }));
  return <QueryClientProvider client={client}><IdentityProvider>{children}</IdentityProvider></QueryClientProvider>;
}
