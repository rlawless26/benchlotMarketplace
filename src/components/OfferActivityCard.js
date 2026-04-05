/**
 * OfferActivityCard Component
 * Renders inline offer activity within a conversation timeline.
 * Styled as a full-width card (not a chat bubble) with offer details and action buttons.
 */
import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  ArrowRight,
  Loader
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOffers } from '../firebase/hooks/useOffers';
import { useAuth } from '../firebase/hooks/useAuth';

const OfferActivityCard = ({ message, onOfferAction }) => {
  const { user } = useAuth();
  const { acceptOffer, counterOffer, declineOffer, OfferStatus } = useOffers();

  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const { offerId, offerSnapshot } = message;
  const { status, currentPrice, originalPrice } = offerSnapshot || {};

  // Determine if this user can act on this offer
  const isCurrentUser = message.senderId === user?.uid;
  const canAct = !isCurrentUser && [OfferStatus.PENDING, OfferStatus.COUNTERED].includes(status);

  const formatPrice = (price) => {
    if (!price && price !== 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = () => {
    switch (status) {
      case OfferStatus.PENDING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case OfferStatus.ACCEPTED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </span>
        );
      case OfferStatus.COUNTERED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <DollarSign className="h-3 w-3 mr-1" />
            Countered
          </span>
        );
      case OfferStatus.DECLINED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-800">
            <Clock className="h-3 w-3 mr-1" />
            {status?.charAt(0).toUpperCase() + status?.slice(1)}
          </span>
        );
    }
  };

  const handleAccept = async () => {
    try {
      setProcessing(true);
      setError('');
      await acceptOffer(offerId);
      if (onOfferAction) onOfferAction();
    } catch (err) {
      console.error('Error accepting offer:', err);
      setError('Failed to accept offer.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    try {
      setProcessing(true);
      setError('');
      await declineOffer(offerId);
      if (onOfferAction) onOfferAction();
    } catch (err) {
      console.error('Error declining offer:', err);
      setError('Failed to decline offer.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCounter = async (e) => {
    e.preventDefault();
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (amount > originalPrice) {
      setError('Counter cannot exceed asking price.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      await counterOffer(offerId, amount, counterMessage);
      setShowCounterForm(false);
      setCounterAmount('');
      setCounterMessage('');
      if (onOfferAction) onOfferAction();
    } catch (err) {
      console.error('Error countering offer:', err);
      setError('Failed to send counter offer.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex justify-center my-3">
      <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-stone-800">
            {status === OfferStatus.PENDING && (isCurrentUser ? 'Offer Submitted' : 'Offer Received')}
            {status === OfferStatus.COUNTERED && 'Counter Offer'}
            {status === OfferStatus.ACCEPTED && 'Offer Accepted'}
            {status === OfferStatus.DECLINED && 'Offer Declined'}
            {status === OfferStatus.CANCELLED && 'Offer Cancelled'}
            {status === OfferStatus.EXPIRED && 'Offer Expired'}
          </h4>
          <span className="text-xs text-stone-500">{formatDate(message.createdAt)}</span>
        </div>

        {/* Price and status */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-lg font-semibold text-spruce">{formatPrice(currentPrice)}</span>
            {originalPrice && currentPrice !== originalPrice && (
              <span className="text-sm text-stone-500 ml-2">
                of {formatPrice(originalPrice)} asking
              </span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* Action buttons — only show for the other party on actionable statuses */}
        {canAct && !showCounterForm && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAccept}
              disabled={processing}
              className="flex-1 py-1.5 px-3 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {processing ? <Loader className="h-4 w-4 animate-spin mx-auto" /> : 'Accept'}
            </button>
            <button
              onClick={() => {
                setShowCounterForm(true);
                const suggested = Math.floor((currentPrice + originalPrice) / 2);
                setCounterAmount(suggested.toString());
              }}
              disabled={processing}
              className="flex-1 py-1.5 px-3 text-sm font-medium rounded-md text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              Counter
            </button>
            <button
              onClick={handleDecline}
              disabled={processing}
              className="flex-1 py-1.5 px-3 text-sm font-medium rounded-md text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {/* Accepted — show checkout link for buyer */}
        {status === OfferStatus.ACCEPTED && !isCurrentUser && (
          <Link
            to={`/checkout?offerId=${offerId}`}
            className="mt-2 w-full inline-flex justify-center items-center py-2 px-4 text-sm font-medium rounded-md text-bone bg-spruce hover:bg-spruce-light transition-colors"
          >
            Complete Purchase
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        )}

        {/* Counter form */}
        {showCounterForm && (
          <form onSubmit={handleCounter} className="mt-3 space-y-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-stone-500" />
              </div>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-sm border border-stone-300 rounded-md focus:ring-spruce focus:border-spruce"
                placeholder="Your counter offer"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value.replace(/[^\d.]/g, ''))}
                autoFocus
              />
            </div>
            <textarea
              className="w-full text-sm border border-stone-300 rounded-md p-2 focus:ring-spruce focus:border-spruce"
              rows="2"
              placeholder="Message (optional)"
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCounterForm(false)}
                className="flex-1 py-1.5 text-sm font-medium rounded-md text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 py-1.5 text-sm font-medium rounded-md text-bone bg-spruce hover:bg-spruce-light transition-colors disabled:opacity-50"
              >
                {processing ? <Loader className="h-4 w-4 animate-spin mx-auto" /> : 'Send Counter'}
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
};

export default OfferActivityCard;
