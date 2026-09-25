import React, { useState, useEffect } from 'react';
import { apiFetch, getCommunityPosts, createCommunityPost, getCommentsForPost, createComment } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/types/api';
import Header from '@/components/layout/Header';
import { MessageCircle, MoreHorizontal, Send, Hash, Flag, ShieldCheck } from 'lucide-react';

type CommunityPost = Database['public']['Tables']['community_posts']['Row'] & {
  verificationStatus?: 'unconfirmed' | 'verified' | 'resolved' | 'false';
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type CommunityComment = Database['public']['Tables']['community_comments']['Row'] & {
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const CommunityPage: React.FC = () => {
  const { session } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchPosts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts as CommunityPost[]);
    } catch (err) {
      setErrorMessage('Failed to fetch community posts. Please try again later.');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPostContent.trim()) {
      setErrorMessage('Post content cannot be empty.');
      return;
    }
    if (!profile) {
      setErrorMessage('You must be logged in to create a post.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: createError } = await createCommunityPost(
        newPostContent,
        profile.id,
        newPostCategory.trim() || null
      );
      if (createError) {
        setErrorMessage(createError.message || 'Failed to create post.');
      } else {
        setNewPostContent('');
        setNewPostCategory('');
        setSuccessMessage('Post shared successfully!');
        fetchPosts();
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred while creating the post.');
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <Header />  
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Community</h1>
          <p className="text-sm text-gray-500 mt-1">Share experiences and connect with neighbors</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Create Post Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="flex space-x-3">
              <img
                src={profile?.avatar_url || 'https://via.placeholder.com/40'}
                alt="Your avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <textarea
                  className="w-full border-none resize-none focus:ring-0 focus:outline-none text-lg placeholder-gray-500 bg-gray-50 rounded-lg p-3"
                  rows={3}
                  placeholder="What's happening in your neighborhood?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  disabled={isSubmitting}
                />
                
                {/* Category Input */}
                <div className="flex items-center space-x-2 mt-3 mb-3">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="flex-1 border-none focus:ring-0 focus:outline-none text-sm placeholder-gray-400 bg-transparent"
                    placeholder="Add a topic (optional)"
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Error/Success Messages */}
                {errorMessage && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{errorMessage}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-600 text-sm">{successMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Post Actions */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Do not post names, phone numbers, or sensitive evidence.</span>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !newPostContent.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-full transition-colors duration-200"
            >
              {isSubmitting ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.length === 0 && !loading && !errorMessage && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No posts yet</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to share something with your community!</p>
            </div>
          )}
          
          {posts.map((post) => <PostCard key={post.id} post={post} session={session} />)}
        </div>
      </div>
    </div>
  );
};

const PostCard: React.FC<{ post: CommunityPost; session: any }> = ({ post, session }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [reported, setReported] = useState(false);

  const fetchComments = async () => {
    setCommentLoading(true);
    setCommentError(null);
    try {
      const fetchedComments = await getCommentsForPost(post.id);
      setComments(fetchedComments as CommunityComment[]);
    } catch (err) {
      setCommentError('Failed to fetch comments. Please try again.');
      console.error('Error fetching comments:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);

    if (!newCommentContent.trim()) {
      setCommentError('Comment content cannot be empty.');
      return;
    }

    if (!session?.user?.id) {
      setCommentError('You must be logged in to post a comment.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { error: createCommentError } = await createComment(
        post.id,
        session.user.id,
        newCommentContent
      );
      if (createCommentError) {
        setCommentError(createCommentError.message || 'Failed to create comment.');
      } else {
        setNewCommentContent('');
        fetchComments();
      }
    } catch (err) {
      setCommentError('An unexpected error occurred while creating the comment.');
      console.error('Error creating comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const reportPost = async () => {
    if (!session?.user?.id || reported) return;
    try { await apiFetch(`/community/posts/${post.id}/report`, { method: 'POST', body: JSON.stringify({ reason: 'user_report' }) }); setReported(true); }
    catch { setCommentError('Could not report this post. Please try again.'); }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return `${Math.floor(diffInHours / 24)}d`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Post Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img
              src={post.profiles?.avatar_url || 'https://via.placeholder.com/40'}
              alt={post.profiles?.full_name || 'Anonymous'}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
            />
            <div>
              <p className="font-semibold text-gray-900">
                {post.profiles?.full_name || 'Anonymous'}
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{formatTimeAgo(post.created_at)}</span>
                {post.category && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-medium">#{post.category}</span>
                  </>
                )}
              </div>
              {post.verificationStatus === 'verified' && <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-700"><ShieldCheck className="h-3 w-3" /> Verified information</span>}
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Post Content */}
        <p className="text-gray-800 text-base leading-relaxed mb-4">{post.content}</p>

        {/* Post Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <span>{comments.length} comments</span>
          </div>
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 px-4 py-2 rounded-full text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </button>

          <button onClick={reportPost} disabled={!session?.user?.id || reported} className="flex items-center space-x-2 px-4 py-2 rounded-full text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <Flag className="w-5 h-5" />
            <span className="font-medium">{reported ? 'Reported' : 'Report'}</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="p-4 space-y-4">
            {commentLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {commentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{commentError}</p>
              </div>
            )}

            {comments.length === 0 && !commentLoading && !commentError && (
              <p className="text-gray-500 text-sm text-center py-4">No comments yet. Start the conversation!</p>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <img
                    src={comment.profiles?.avatar_url || 'https://via.placeholder.com/32'}
                    alt={comment.profiles?.full_name || 'Anonymous'}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="bg-white rounded-2xl px-4 py-2 inline-block">
                      <p className="font-semibold text-sm text-gray-900">
                        {comment.profiles?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-gray-800 text-sm">{comment.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-4">
                      {formatTimeAgo(comment.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <form onSubmit={handleCommentSubmit} className="flex space-x-3 pt-2">
              <img
                src={ 'https://img.freepik.com/vecteurs-libre/cercle-bleu-utilisateur-blanc_78370-4707.jpg?semt=ais_hybrid&w=740&q=80'}
                alt="Your avatar"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 flex space-x-2">
                <input
                  type="text"
                  className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Write a comment..."
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  disabled={isSubmittingComment}
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newCommentContent.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
