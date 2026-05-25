'use client';

import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import type { Socket } from 'socket.io-client';
import { getAuthHeadersAsync } from '@/lib/api';
import { getErrorMessage } from '@/lib/userErrors';
import { connectProjectRoom, createApiSocket } from '@/lib/realtime';
import { useProfileView } from '@/lib/context/ProfileViewContext';

const API = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:5001';

interface FeedPost {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug?: string;
  projectCategory?: string;
  projectCity?: string;
  authorId: string;
  body: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  liked?: boolean;
}

interface CommentItem {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  replies: CommentItem[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m || 1}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function PostCard({
  post,
  userContact,
  onLikeToggle,
  onViewProfile,
}: {
  post: FeedPost;
  userContact?: string;
  onLikeToggle: (id: string) => void;
  onViewProfile?: (contact: string) => void;
}) {
  const [showComments, setShowComments]   = useState(false);
  const [comments, setComments]           = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentBody, setCommentBody]     = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [replyTo, setReplyTo]             = useState<string | null>(null);
  const [replyBody, setReplyBody]         = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/comments`);
      const data = await res.json();
      if (data.success) setComments(data.data.comments);
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (showComments) loadComments();
  }, [showComments, loadComments]);

  const submitComment = async (body: string, parentId?: string) => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: await getAuthHeadersAsync(),
        body: JSON.stringify({ body: body.trim(), parentCommentId: parentId || null }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentBody(''); setReplyBody(''); setReplyTo(null);
        loadComments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
      {/* Post header */}
      <div className="px-5 pt-4 pb-2 flex items-start gap-3">
        <button
          type="button"
          onClick={() => post.authorId && onViewProfile?.(post.authorId)}
          className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-sm font-bold shrink-0 hover:ring-2 hover:ring-[#0A66C2]/30 transition-all"
        >
          {post.authorId?.slice(0, 2).toUpperCase() || 'MB'}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {post.projectSlug ? (
                <Link href={`/p/${post.projectSlug}`} className="font-bold text-sm text-[#1d2226] hover:text-[#0A66C2] hover:underline">
                  {post.projectName}
                </Link>
              ) : (
                <span className="font-bold text-sm text-[#1d2226]">{post.projectName}</span>
              )}
              {post.projectCity && (
                <span className="ml-2 text-xs text-[#999]">📍 {post.projectCity}</span>
              )}
              <button
                type="button"
                onClick={() => post.authorId && onViewProfile?.(post.authorId)}
                className="block text-xs text-[#666] hover:text-[#0A66C2] hover:underline text-left"
              >
                {post.authorId}
              </button>
            </div>
            <span className="text-xs text-[#bbb] shrink-0">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-3">
        <p className="text-sm text-[#1d2226] leading-relaxed whitespace-pre-line">{post.body}</p>
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="mt-3 w-full rounded-xl object-cover max-h-72 border border-[#e0e0e0]" />
        )}
      </div>

      {/* Like / comment counts */}
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <div className="px-5 pb-1 flex items-center gap-4 text-xs text-[#999]">
          {post.likeCount > 0 && <span>👍 {post.likeCount} like{post.likeCount !== 1 ? 's' : ''}</span>}
          {post.commentCount > 0 && (
            <button onClick={() => setShowComments(s => !s)} className="hover:underline">
              💬 {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="px-3 py-2 flex gap-1 border-t border-[#f0f0f0]">
        <button
          onClick={() => onLikeToggle(post.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
            post.liked
              ? 'bg-[#EEF3FB] text-[#0A66C2]'
              : 'text-[#666] hover:bg-[#f3f2ef]'
          }`}
        >
          <span className="text-base">{post.liked ? '👍' : '👍'}</span> Like
        </button>
        <button
          onClick={() => { setShowComments(s => !s); setTimeout(() => textRef.current?.focus(), 100); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-[#666] hover:bg-[#f3f2ef] transition-all flex-1 justify-center"
        >
          <span className="text-base">💬</span> Comment
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-5 pb-4 space-y-3 border-t border-[#f0f0f0] pt-3">
          {/* Add comment */}
          {userContact && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {userContact.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2 items-start">
                <textarea
                  ref={textRef}
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(commentBody); } }}
                  placeholder="Write a comment…"
                  rows={1}
                  className="flex-1 px-3 py-2 bg-[#f3f2ef] border border-[#d9d9d9] rounded-xl text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] resize-none"
                />
                <button
                  disabled={!commentBody.trim() || submitting}
                  onClick={() => submitComment(commentBody)}
                  className="px-3 py-2 bg-[#0A66C2] text-white rounded-xl text-sm font-semibold hover:bg-[#004182] disabled:opacity-40 transition-all shrink-0"
                >
                  {submitting ? '…' : '→'}
                </button>
              </div>
            </div>
          )}

          {/* Comment list */}
          {loadingComments ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-10 bg-[#f3f2ef] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => c.authorId && onViewProfile?.(c.authorId)}
                      className="w-7 h-7 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[#666] text-xs font-bold shrink-0 hover:ring-2 hover:ring-[#0A66C2]/30"
                    >
                      {c.authorId?.slice(0, 2).toUpperCase()}
                    </button>
                    <div className="flex-1 bg-[#f3f2ef] rounded-xl px-3 py-2">
                      <button
                        type="button"
                        onClick={() => c.authorId && onViewProfile?.(c.authorId)}
                        className="text-xs font-bold text-[#1d2226] hover:text-[#0A66C2] hover:underline"
                      >
                        {c.authorId}
                      </button>
                      <p className="text-xs text-[#1d2226] mt-0.5 leading-relaxed">{c.body}</p>
                    </div>
                  </div>

                  {/* Replies */}
                  {c.replies?.map(r => (
                    <div key={r.id} className="flex gap-2 ml-8">
                      <button
                        type="button"
                        onClick={() => r.authorId && onViewProfile?.(r.authorId)}
                        className="w-6 h-6 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[#666] text-[10px] font-bold shrink-0 hover:ring-2 hover:ring-[#0A66C2]/30"
                      >
                        {r.authorId?.slice(0, 2).toUpperCase()}
                      </button>
                      <div className="flex-1 bg-[#f3f2ef] rounded-xl px-3 py-2">
                        <button
                          type="button"
                          onClick={() => r.authorId && onViewProfile?.(r.authorId)}
                          className="text-[10px] font-bold text-[#1d2226] hover:text-[#0A66C2] hover:underline"
                        >
                          {r.authorId}
                        </button>
                        <p className="text-xs text-[#1d2226] mt-0.5">{r.body}</p>
                      </div>
                    </div>
                  ))}

                  {/* Reply button */}
                  {userContact && (
                    <>
                      <button
                        onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                        className="ml-9 text-xs text-[#666] hover:text-[#0A66C2] font-semibold"
                      >
                        Reply
                      </button>
                      {replyTo === c.id && (
                        <div className="flex gap-2 ml-9">
                          <textarea
                            value={replyBody}
                            onChange={e => setReplyBody(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(replyBody, c.id); } }}
                            placeholder={`Reply to ${c.authorId}…`}
                            rows={1}
                            className="flex-1 px-3 py-2 bg-[#f3f2ef] border border-[#d9d9d9] rounded-xl text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] resize-none"
                          />
                          <button
                            disabled={!replyBody.trim() || submitting}
                            onClick={() => submitComment(replyBody, c.id)}
                            className="px-3 py-2 bg-[#0A66C2] text-white rounded-xl text-sm font-semibold hover:bg-[#004182] disabled:opacity-40 transition-all"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-center text-[#bbb] py-2">No comments yet. Be the first!</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MAX_IMAGE_BYTES = 1_200_000;

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose a JPG, PNG, or WebP image.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Image must be under 1.2 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

/* ── New Post composer ── */
function PostComposer({
  projectId,
  userContact,
  onPosted,
}: {
  projectId: string;
  userContact: string;
  onPosted: () => void;
}) {
  const [body, setBody] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = Boolean(body.trim() || imageDataUrl);

  const clearImage = () => {
    setImagePreview(null);
    setImageDataUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await readImageFile(file);
      setImagePreview(dataUrl);
      setImageDataUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid image');
      clearImage();
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/posts`, {
        method: 'POST',
        headers: await getAuthHeadersAsync(),
        body: JSON.stringify({
          projectId,
          body: body.trim(),
          imageUrl: imageDataUrl || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(getErrorMessage(data?.error, 'post'));
      }
      setBody('');
      clearImage();
      onPosted();
    } catch (err) {
      setError(getErrorMessage(err, 'post'));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-sm font-bold shrink-0">
          {userContact.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share an update, milestone, or caption for your photo…"
            rows={3}
            className="w-full px-4 py-3 bg-[#f3f2ef] border border-[#d9d9d9] rounded-xl text-sm text-[#1d2226] placeholder-[#999] focus:outline-none focus:border-[#0A66C2] resize-none"
          />
          {imagePreview && (
            <div className="relative inline-block max-w-full">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 rounded-xl border border-[#e0e0e0] object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full text-sm hover:bg-black/80"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onPickImage}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2 text-sm font-semibold text-[#666] border border-[#d9d9d9] rounded-full hover:border-[#0A66C2] hover:text-[#0A66C2]"
              >
                📷 Add photo
              </button>
              <span className="text-[10px] text-[#999]">JPG, PNG · max 1.2 MB</span>
            </div>
            <button
              disabled={!canSubmit || posting}
              onClick={submit}
              className="px-5 py-2 bg-[#0A66C2] text-white rounded-full text-sm font-bold hover:bg-[#004182] disabled:opacity-40 transition-all"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ProjectFeed export ── */
interface ProjectFeedProps {
  /** Omit for global recent posts feed (Home tab) */
  projectId?: string;
  userContact?: string;
  isOwner?: boolean;
  /** Show post composer (owner or any signed-in teammate) */
  canPost?: boolean;
  /** Load all recent posts from /api/feed */
  global?: boolean;
}

export function ProjectFeed({ projectId, userContact, isOwner, canPost, global = false }: ProjectFeedProps) {
  const [posts, setPosts]     = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { openProfile } = useProfileView();

  const loadPosts = useCallback(async (reset = false) => {
    setLoading(true);
    const p = reset ? 1 : page;
    try {
      const url = global
        ? `${API}/api/feed?page=${p}&limit=15`
        : `${API}/api/projects/${projectId}/posts?page=${p}&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const loaded = data.data.posts as FeedPost[];
        setPosts(prev => reset ? loaded : [...prev, ...loaded]);
        setHasMore(data.data.hasMore);
        if (reset) setPage(1);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, page, global]);

  useEffect(() => {
    if (!global && !projectId) return;
    loadPosts(true);
  }, [projectId, global]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Live updates via socket ── */
  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    const normalizePost = (raw: Record<string, unknown>): FeedPost => ({
      id: String(raw.id || raw._id || ''),
      projectId: String(raw.projectId || projectId || ''),
      projectName: String(raw.projectName || ''),
      projectSlug: raw.projectSlug ? String(raw.projectSlug) : undefined,
      projectCategory: raw.projectCategory ? String(raw.projectCategory) : undefined,
      projectCity: raw.projectCity ? String(raw.projectCity) : undefined,
      authorId: String(raw.authorId || ''),
      body: String(raw.body || ''),
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
      likeCount: Number(raw.likeCount || 0),
      commentCount: Number(raw.commentCount || 0),
      createdAt: String(raw.createdAt || new Date().toISOString()),
    });

    const attachListeners = (s: Socket) => {
      const onPostCreated = (raw: Record<string, unknown>) => {
        const post = normalizePost(raw);
        if (!global && projectId && post.projectId !== projectId) return;
        setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
      };

      const onFeedPost = (raw: Record<string, unknown>) => {
        if (!global) return;
        onPostCreated(raw);
      };

      const onPostLiked = ({
        postId,
        likeCount,
      }: {
        postId: string;
        likeCount: number;
      }) => {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likeCount } : p))
        );
      };

      const onCommentAdded = ({
        postId,
      }: {
        postId: string;
      }) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
          )
        );
      };

      s.on('post_created', onPostCreated);
      s.on('feed_post_created', onFeedPost);
      s.on('post_liked', onPostLiked);
      s.on('comment_added', onCommentAdded);

      return () => {
        s.off('post_created', onPostCreated);
        s.off('feed_post_created', onFeedPost);
        s.off('post_liked', onPostLiked);
        s.off('comment_added', onCommentAdded);
      };
    };

    let detach: (() => void) | undefined;

    (async () => {
      if (global) {
        socket = await createApiSocket();
      } else if (projectId) {
        socket = await connectProjectRoom(projectId, { contact: userContact });
      }
      if (cancelled || !socket) return;
      detach = attachListeners(socket);
    })();

    return () => {
      cancelled = true;
      detach?.();
      socket?.disconnect();
    };
  }, [projectId, global, userContact]);

  const handleLike = async (postId: string) => {
    if (!userContact) return;
    try {
      const res = await fetch(`${API}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: await getAuthHeadersAsync(),
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likeCount: data.data.likeCount, liked: data.data.liked } : p
        ));
      }
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Composer — only for project members or owners */}
      {!global && projectId && userContact && (canPost ?? isOwner) && (
        <PostComposer projectId={projectId} userContact={userContact} onPosted={() => loadPosts(true)} />
      )}

      {/* Feed */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="bg-white rounded-2xl border border-[#e0e0e0] p-5 animate-pulse h-32" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#d9d9d9] p-10 text-center">
          <p className="text-3xl mb-2">📣</p>
          <p className="font-semibold text-[#1d2226]">No posts yet</p>
          <p className="text-sm text-[#666] mt-1">
            {global
              ? 'When teams share updates, they will show up here.'
              : 'Post a project update to keep your team engaged.'}
          </p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userContact={userContact}
              onLikeToggle={handleLike}
              onViewProfile={(contact) => openProfile(contact, contact)}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => { setPage(p => p + 1); loadPosts(); }}
              disabled={loading}
              className="w-full py-2.5 border border-[#d9d9d9] text-[#666] font-semibold rounded-full hover:border-[#0A66C2] hover:text-[#0A66C2] text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load older posts'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
