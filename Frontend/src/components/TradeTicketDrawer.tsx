import { useEffect, useMemo, useState } from 'react';
import { getQuotes } from '../api/market';

export interface TradeTicketInput {
  ticker: string;
  company: string;
  side: 'BUY' | 'SELL';
  price: number;
}

interface TradeTicketDrawerProps {
  isOpen: boolean;
  ticket: TradeTicketInput | null;
  onClose: () => void;
  onPlaceOrder: (side: 'BUY' | 'SELL', ticker: string, price: number) => void;
}

export function TradeTicketDrawer({ isOpen, ticket, onClose, onPlaceOrder }: TradeTicketDrawerProps) {
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState<number>(ticket?.price || 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) {
      return;
    }

    setOrderType('Market');
    setQuantity('1');
    setLimitPrice(ticket.price.toFixed(2));
    setDisplayPrice(ticket.price);
    setError(null);
  }, [ticket]);

  useEffect(() => {
    if (!isOpen || !ticket) {
      return;
    }

    let isMounted = true;
    const loadLatestQuote = async () => {
      try {
        const quotes = await getQuotes([ticket.ticker]);
        const nextPrice = quotes[ticket.ticker]?.price;
        if (isMounted && typeof nextPrice === 'number' && Number.isFinite(nextPrice)) {
          setDisplayPrice(nextPrice);
          setLimitPrice(nextPrice.toFixed(2));
        }
      } catch {
        if (isMounted) {
          setError('Live data temporarily unavailable');
        }
      }
    };

    void loadLatestQuote();

    return () => {
      isMounted = false;
    };
  }, [isOpen, ticket]);

  const computedUnitPrice = useMemo(() => {
    if (orderType === 'Limit') {
      const parsed = Number(limitPrice);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return displayPrice;
  }, [orderType, limitPrice, displayPrice]);

  const estimatedTotal = useMemo(() => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return 0;
    }
    return qty * computedUnitPrice;
  }, [quantity, computedUnitPrice]);

  if (!isOpen || !ticket) {
    return null;
  }

  const handlePlaceOrder = () => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (orderType === 'Limit') {
      const parsedLimit = Number(limitPrice);
      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        setError('Limit price is required for limit orders');
        return;
      }
    }

    setError(null);
    onPlaceOrder(ticket.side, ticket.ticker, computedUnitPrice);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-zinc-100 text-lg">Trade Ticket</h2>
          <p className="text-zinc-500 text-sm mt-1">{ticket.side} {ticket.ticker} • {ticket.company}</p>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-zinc-300 text-sm mb-2">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as 'Market' | 'Limit')}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="Market">Market</option>
              <option value="Limit">Limit</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 text-sm mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {orderType === 'Limit' && (
            <div>
              <label className="block text-zinc-300 text-sm mb-2">Limit Price (GBp)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
            <p className="text-zinc-500 text-sm">Current Price: <span className="text-zinc-300">{displayPrice.toFixed(2)} GBp</span></p>
            <p className="text-zinc-500 text-sm mt-1">Estimated Total: <span className="text-zinc-300">{estimatedTotal.toFixed(2)} GBp</span></p>
          </div>

          {error && (
            <div className="p-3 bg-red-950 border border-red-900 rounded">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 flex gap-3">
          <button
            onClick={handlePlaceOrder}
            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Place Order
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
