import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ModerationPost = { id: string; content: string; category?: string; moderationStatus: string; verificationStatus: string; reportsCount: number; author?: { fullName?: string } };

export function CommunityModeration() {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const load = () => apiFetch<ModerationPost[]>('/community/moderation').then(setPosts);
  useEffect(() => { void load(); }, []);
  const update = async (id: string, values: Record<string, string>) => { await apiFetch(`/community/posts/${id}/moderate`, { method: 'PATCH', body: JSON.stringify(values) }); await load(); };
  if (!posts.length) return <Card><CardContent className="py-10 text-center text-muted-foreground">No community posts need review.</CardContent></Card>;
  return <div className="space-y-3">{posts.map(post => <Card key={post.id}><CardContent className="space-y-3 py-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="destructive">{post.reportsCount} report(s)</Badge><Badge variant="outline">{post.moderationStatus}</Badge><Badge variant="secondary">{post.verificationStatus}</Badge></div><p>{post.content}</p><p className="text-xs text-muted-foreground">By {post.author?.fullName || 'community member'} · {post.category || 'uncategorized'}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => update(post.id, { moderationStatus: 'visible' })}>Keep visible</Button><Button size="sm" variant="destructive" onClick={() => update(post.id, { moderationStatus: 'removed' })}>Remove</Button><Button size="sm" variant="outline" onClick={() => update(post.id, { verificationStatus: 'verified', moderationStatus: 'visible' })}>Verify information</Button><Button size="sm" variant="outline" onClick={() => update(post.id, { verificationStatus: 'false', moderationStatus: 'visible' })}>Mark false</Button></div></CardContent></Card>)}</div>;
}
