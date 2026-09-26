import { useState } from "react";
import { ExternalLink, Loader2, LogOut, MessageCircle, Plus, Save, Send, ShieldCheck, Trash2, UserX } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import FormTemplateManager from "@/components/FormTemplateManager";

type UpdateStatus = "Published on LinkedIn" | "Ready to sync";
type UpdateForm = { label: string; title: string; excerpt: string; dateLabel: string; status: UpdateStatus; linkedinUrl: string };
const emptyForm: UpdateForm = { label: "Career note", title: "", excerpt: "", dateLabel: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), status: "Ready to sync", linkedinUrl: "" };

function UpdateFields({ value, onChange }: { value: UpdateForm; onChange: (next: UpdateForm) => void }) {
  const set = (key: keyof UpdateForm, fieldValue: string) => onChange({ ...value, [key]: fieldValue });
  return <div className="admin-update-fields">
    <label><span>Label</span><input value={value.label} onChange={(event) => set("label", event.target.value)} placeholder="Operations" /></label>
    <label><span>Post title</span><input value={value.title} onChange={(event) => set("title", event.target.value)} placeholder="A clear title for the update" /></label>
    <label><span>Date shown</span><input value={value.dateLabel} onChange={(event) => set("dateLabel", event.target.value)} placeholder="21 Sep 2026" /></label>
    <label><span>Status</span><select value={value.status} onChange={(event) => set("status", event.target.value as UpdateStatus)}><option>Ready to sync</option><option>Published on LinkedIn</option></select></label>
    <label className="admin-field-wide"><span>Short description</span><textarea value={value.excerpt} onChange={(event) => set("excerpt", event.target.value)} rows={4} placeholder="What is this LinkedIn update about?" /></label>
    <label className="admin-field-wide"><span>Original LinkedIn post URL</span><input value={value.linkedinUrl} onChange={(event) => set("linkedinUrl", event.target.value)} placeholder="https://www.linkedin.com/posts/..." /><small className="admin-field-help">The public card's arrow will open this exact original post in a new tab.</small></label>
  </div>;
}

function RequestHistory() {
  const requests = trpc.telegramAdmin.requests.useQuery();
  const utils = trpc.useUtils();
  const revoke = trpc.telegramAdmin.revoke.useMutation({ onSuccess: () => { void utils.telegramAdmin.requests.invalidate(); } });
  return <section className="admin-card admin-wide-card"><div className="admin-card-heading"><div><span className="admin-eyebrow">Calculator security</span><h2>Telegram access history</h2></div><span className="admin-count">{requests.data?.length ?? 0} requests</span></div><p className="admin-section-note">Review who asked to use the calculator. Names are supplied by the requester and should be verified before approval. Revoking an approved request immediately makes its access token invalid on the next status check.</p>{requests.isLoading ? <div className="admin-empty"><Loader2 className="spin" size={18} /> Loading request history…</div> : requests.data?.length ? <div className="request-list">{requests.data.map((request) => <div className="request-row" key={request.requestId}><div><div className="request-meta"><strong>{request.requesterName}</strong><time>{new Date(request.createdAt).toLocaleString()}</time></div><div className="request-meta"><span>{request.telegramUsername ? `@${request.telegramUsername}` : "Telegram user not recorded"}</span></div><code>{request.requestId}</code></div><div className="request-actions"><strong className={`request-status ${request.status}`}>{request.status}</strong>{(request.status === "approved" || request.status === "pending") && <button className="admin-revoke" onClick={() => { if (window.confirm("Revoke this calculator access request?")) revoke.mutate({ requestId: request.requestId }); }} disabled={revoke.isPending}><UserX size={13} /> Revoke</button>}</div></div>)}</div> : <div className="admin-empty">No Telegram access requests yet.</div>}</section>;
}

function TelegramInbox() {
  const messages = trpc.telegramAdmin.messages.useQuery();
  const utils = trpc.useUtils();
  const [replyText, setReplyText] = useState("");
  const [replyChatId, setReplyChatId] = useState<string | null>(null);
  const reply = trpc.telegramAdmin.reply.useMutation({ onSuccess: async () => { setReplyText(""); setReplyChatId(null); await utils.telegramAdmin.messages.invalidate(); } });
  return <section className="admin-card admin-wide-card"><div className="admin-card-heading"><div><span className="admin-eyebrow">Telegram inbox</span><h2>Bot conversations</h2></div><span className="admin-count">{messages.data?.length ?? 0} messages</span></div><p className="admin-section-note">Messages sent to the bot are forwarded to the connected admin chat. You can review them here, or reply directly to the forwarded Telegram message.</p>{messages.isLoading ? <div className="admin-empty"><Loader2 className="spin" size={18} /> Loading Telegram messages…</div> : messages.data?.length ? <div className="telegram-thread">{messages.data.map((message) => <div className={`telegram-message ${message.direction}`} key={message.id}><div className="telegram-message-meta"><strong>{message.direction === "inbound" ? (message.telegramUsername ? `@${message.telegramUsername}` : "Telegram user") : "Bot / admin"}</strong><time>{new Date(message.createdAt).toLocaleString()}</time><span>chat {message.chatId}</span></div><p>{message.messageText}</p>{message.direction === "inbound" && <div className="telegram-reply"><button className="admin-reply-toggle" onClick={() => setReplyChatId(replyChatId === message.chatId ? null : message.chatId)}><MessageCircle size={13} /> Reply to this chat</button>{replyChatId === message.chatId && <div className="telegram-reply-form"><textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={2} placeholder="Write a reply to send through the bot…" /><button className="button-primary" onClick={() => reply.mutate({ chatId: message.chatId, text: replyText })} disabled={reply.isPending || !replyText.trim()}>{reply.isPending ? <Loader2 className="spin" size={14} /> : <Send size={14} />} Send reply</button></div>}</div>}</div>)}</div> : <div className="admin-empty">No Telegram conversation messages yet. Users can message the bot after the admin sends /start.</div>}</section>;
}

export default function AdminUpdates() {
  const { user, loading, logout } = useAuth();
  const [form, setForm] = useState<UpdateForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const updates = trpc.linkedinUpdates.list.useQuery(undefined, { enabled: Boolean(user?.role === "admin") });
  const utils = trpc.useUtils();
  const create = trpc.linkedinUpdates.create.useMutation({ onSuccess: async () => { setForm(emptyForm); await utils.linkedinUpdates.list.invalidate(); } });
  const update = trpc.linkedinUpdates.update.useMutation({ onSuccess: async () => { setEditingId(null); setForm(emptyForm); await utils.linkedinUpdates.list.invalidate(); } });
  const remove = trpc.linkedinUpdates.remove.useMutation({ onSuccess: () => utils.linkedinUpdates.list.invalidate() });

  if (loading) return <div className="admin-loading"><Loader2 className="spin" size={20} /> Checking admin access…</div>;
  if (!user) return <div className="admin-auth"><div><p className="section-kicker">Private workspace</p><h1>Sign in to manage this portfolio.</h1><p>Only the portfolio owner or an administrator can manage LinkedIn updates, Telegram access, and bot conversations.</p><button className="button-primary" onClick={() => startLogin()}>Sign in</button><Link className="admin-back-link" href="/">Back to portfolio</Link></div></div>;
  if (user.role !== "admin") return <div className="admin-auth"><div><p className="section-kicker">Access restricted</p><h1>Admin permission required.</h1><p>This account can view the portfolio but does not have permission to manage content or Telegram conversations.</p><button className="button-dark" onClick={() => logout()}>Sign out</button><Link className="admin-back-link" href="/">Back to portfolio</Link></div></div>;

  const saveNew = () => { if (!form.title.trim() || !form.excerpt.trim()) return; create.mutate({ ...form, linkedinUrl: form.linkedinUrl.trim() }); };
  const beginEdit = (item: NonNullable<typeof updates.data>[number]) => { setEditingId(item.id); setForm({ label: item.label, title: item.title, excerpt: item.excerpt, dateLabel: item.dateLabel, status: item.status, linkedinUrl: item.linkedinUrl ?? "" }); };
  const saveEdit = () => { if (editingId === null || !form.title.trim() || !form.excerpt.trim()) return; update.mutate({ id: editingId, ...form, linkedinUrl: form.linkedinUrl.trim() }); };

  return <div className="admin-shell"><header className="admin-header"><div><p className="section-kicker">Portfolio admin</p><h1>Control room</h1><p>Manage LinkedIn content and Telegram access without editing code.</p></div><div className="admin-header-actions"><Link className="admin-back-link" href="/">View portfolio <ExternalLink size={14} /></Link><button className="admin-logout" onClick={() => logout()}><LogOut size={14} /> Sign out</button></div></header><main className="admin-grid">
    <section className="admin-card"><div className="admin-card-heading"><div><span className="admin-eyebrow">{editingId ? "Edit update" : "New update"}</span><h2>{editingId ? "Make a change" : "Publish-ready note"}</h2></div>{editingId && <button className="admin-cancel" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}</div><UpdateFields value={form} onChange={setForm} /><button className="button-primary admin-save" onClick={editingId ? saveEdit : saveNew} disabled={create.isPending || update.isPending || !form.title.trim() || !form.excerpt.trim()}>{create.isPending || update.isPending ? <Loader2 className="spin" size={15} /> : editingId ? <Save size={15} /> : <Plus size={15} />}{editingId ? "Save changes" : "Add update"}</button><small className="admin-helper">Saving a URL makes the public update card open the original LinkedIn post.</small></section>
    <section className="admin-card"><div className="admin-card-heading"><div><span className="admin-eyebrow">Content library</span><h2>Current updates</h2></div><span className="admin-count">{updates.data?.length ?? 0} managed</span></div>{updates.isLoading ? <div className="admin-empty"><Loader2 className="spin" size={18} /> Loading updates…</div> : updates.data?.length ? <div className="admin-list">{updates.data.map((item) => <article className="admin-list-item" key={item.id}><div><div className="admin-item-top"><span>{item.label}</span><time>{item.dateLabel}</time></div><h3>{item.title}</h3><p>{item.excerpt}</p><strong className={item.status === "Published on LinkedIn" ? "admin-status published" : "admin-status"}>{item.status}</strong>{item.linkedinUrl && <a className="admin-original-link" href={item.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Open original post</a>}</div><div className="admin-item-actions"><button onClick={() => beginEdit(item)} aria-label={`Edit ${item.title}`}><Save size={14} /> Edit</button><button className="danger" onClick={() => { if (window.confirm("Delete this update from the website?")) remove.mutate({ id: item.id }); }} aria-label={`Delete ${item.title}`}><Trash2 size={14} /></button></div></article>)}</div> : <div className="admin-empty">No managed updates yet. Add the first one from the form.</div>}</section>
    <FormTemplateManager />
    <RequestHistory />
    <TelegramInbox />
  </main></div>;
}
