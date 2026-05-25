import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ArrowUpDown } from 'lucide-react';
import { Talent } from '../types';

interface PositionAssignModalProps {
  talent: Talent;
  totalPositionedCreators: number;
  onClose: () => void;
  onConfirm: (targetPosition: number) => Promise<void>;
}

const MANUAL_POSITION_THRESHOLD = 100000;

const PositionAssignModal: React.FC<PositionAssignModalProps> = ({
  talent,
  totalPositionedCreators,
  onClose,
  onConfirm,
}) => {
  // Treat any position >= 100000 as "unpositioned" (these are auto-assigned defaults)
  const isManuallyPositioned = talent.position != null && talent.position < MANUAL_POSITION_THRESHOLD;
  const [targetPosition, setTargetPosition] = useState<string>(
    isManuallyPositioned ? talent.position!.toString() : '1'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const position = parseInt(targetPosition, 10);

    if (isNaN(position) || position < 1) {
      setError('Please enter a valid position (minimum 1)');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await onConfirm(position);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update position');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setTargetPosition(value);
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isLoading ? onClose : undefined}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5072a7]/10 flex items-center justify-center">
              <ArrowUpDown className="w-5 h-5 text-[#5072a7]" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Assign Position</h2>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-slate-600 mb-2">
              Moving <span className="font-semibold text-slate-900">{talent.name}</span>
            </p>
            {isManuallyPositioned ? (
              <p className="text-sm text-slate-500">
                Current position: <span className="font-medium">{talent.position}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Currently unpositioned
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Position
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={targetPosition}
              onChange={handleInputChange}
              placeholder="Enter position (e.g., 5)"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5072a7]/20 focus:border-[#5072a7] transition-all text-lg disabled:bg-slate-50 disabled:text-slate-400"
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500">
              Position 1 = top of roster.
              {totalPositionedCreators > 0 && (
                <> Currently {totalPositionedCreators} positioned creator{totalPositionedCreators !== 1 ? 's' : ''}.</>
              )}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || !targetPosition}
              className="px-6 py-2 bg-[#5072a7] text-white rounded-lg hover:bg-[#3d5a87] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PositionAssignModal;
