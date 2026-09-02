import React, { useState } from 'react';
import { marketplaceApi } from '@/lib/api/marketplace';
import { X, Star, AlertTriangle, Loader2 } from 'lucide-react';

export function TrustModals({ 
  isOpen, 
  onClose, 
  type, 
  orderItemId, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  type: 'REVIEW' | 'DISPUTE'; 
  orderItemId: number | null;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('Item not as described');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !orderItemId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (type === 'REVIEW') {
        await marketplaceApi.createReview({
          order_item: orderItemId,
          rating,
          review_text: text
        });
      } else {
        await marketplaceApi.createDispute({
          order_item: orderItemId,
          reason,
          description: text
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {type === 'REVIEW' ? <Star className="text-amber-500 w-5 h-5" /> : <AlertTriangle className="text-rose-500 w-5 h-5" />}
            {type === 'REVIEW' ? 'Leave a Review' : 'Open a Dispute'}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg text-sm font-medium border border-rose-200 dark:border-rose-500/20">
              {error}
            </div>
          )}

          {type === 'REVIEW' && (
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2">Rating</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1 transition-colors ${rating >= star ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'}`}
                  >
                    <Star className="w-8 h-8" fill={rating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'DISPUTE' && (
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2">Reason for Dispute</label>
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#163E6B] outline-none"
              >
                <option value="Item not as described">Item not as described</option>
                <option value="Item damaged">Item arrived damaged</option>
                <option value="Item not received">Item not received</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              {type === 'REVIEW' ? 'Review Details' : 'Please explain the issue'}
            </label>
            <textarea 
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={type === 'REVIEW' ? 'Share your experience with this book and seller...' : 'Provide specific details about what went wrong...'}
              className="w-full h-32 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#163E6B] outline-none resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
              type === 'REVIEW' 
                ? 'bg-[#163E6B] hover:bg-[#163E6B]/90 dark:bg-[#D4A72C] dark:hover:bg-[#D4A72C]/90 dark:text-slate-900' 
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
