import React, { useEffect, useState } from 'react';

interface ReviewHistoryTabProps {
  problemId: number;
  problemTitle?: string;
  problemDifficulty?: string;
  problemConcept?: string;
}

interface ReviewEntry {
  review_date: string;
  result: string;
  interval_days: number;
  next_review_date: string;
  time_spent_minutes?: number;
  notes?: string;
}

interface ReviewHistoryData {
  review_count: number;
  remembered_attempts: number;
  forgot_attempts: number;
  success_rate: number;
  review_timeline: ReviewEntry[];
  planned_reviews?: string[]; // Add planned reviews as optional
}

const ReviewHistoryTab: React.FC<ReviewHistoryTabProps> = ({ problemId, problemTitle, problemDifficulty, problemConcept }) => {
  const [history, setHistory] = useState<ReviewHistoryData | null>(null);

  // Format date function matching original script.js
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    fetch(`http://localhost:3001/api/problems/${problemId}/review-history`)
      .then(res => res.json())
      .then(setHistory);
  }, [problemId]);

  if (!history) return <div className="review-history-content">Loading review history...</div>;

  return (
    <div className="review-history-content">
      <div className="review-panel-content">
        {/* Problem Header */}
        <div className="review-problem-header">
          <div className="review-problem-info">
            {problemTitle && <h2>{problemTitle}</h2>}
            <div className="review-problem-meta">
              {problemDifficulty && <span>{problemDifficulty}</span>}
              {problemDifficulty && problemConcept && <span> • </span>}
              {problemConcept && <span>{problemConcept}</span>}
            </div>
          </div>
        </div>
        <div className="review-stats-grid">
          <div className="review-stat-card">
            <div className="review-stat-number">{history.review_count}</div>
            <div className="review-stat-label">Total Attempts</div>
          </div>
          <div className="review-stat-card">
            <div className="review-stat-number">{history.remembered_attempts}</div>
            <div className="review-stat-label">Remembered</div>
          </div>
          <div className="review-stat-card">
            <div className="review-stat-number">{history.forgot_attempts}</div>
            <div className="review-stat-label">Forgot</div>
          </div>
          <div className="review-stat-card">
            <div className="review-stat-number review-success-rate">{history.success_rate}%</div>
            <div className="review-stat-label">Success Rate</div>
          </div>
        </div>
        {/* Planned Reviews Section */}
        <div className="review-planned-section">
          <h3 className="review-section-title">🗓️ Planned Reviews</h3>
          <div className="review-planned-list">
            {history.planned_reviews && history.planned_reviews.length > 0 ? (
              history.planned_reviews.map((date, idx) => (
                <div className="review-planned-item" key={idx}>{formatDate(date)}</div>
              ))
            ) : (
              <div className="review-planned-item">No planned reviews.</div>
            )}
          </div>
        </div>
        <div className="review-timeline">
          <h3 className="review-section-title">📊 Review Timeline</h3>
          {history.review_timeline && history.review_timeline.length > 0 ? (
            history.review_timeline.map((entry, idx) => (
              <div className="review-timeline-entry" key={idx}>
                <div className={`review-timeline-dot ${entry.result.toLowerCase()}`}></div>
                <div className={`review-timeline-content ${entry.result.toLowerCase()}`}> 
                  <div className="review-timeline-header">
                    <div className="review-timeline-date">{formatDate(entry.review_date)}</div>
                    <div className={`review-timeline-result ${entry.result.toLowerCase()}`}>{entry.result.charAt(0).toUpperCase() + entry.result.slice(1)}</div>
                  </div>
                  <div className="review-timeline-details">
                    <span>Interval: {entry.interval_days} days</span>
                    <span>•</span>
                    <span>Time: {entry.time_spent_minutes ? entry.time_spent_minutes + ' min' : 'N/A'}</span>
                    <span>•</span>
                    <span>Next review: {formatDate(entry.next_review_date)}</span>
                  </div>
                  {entry.notes && (
                    <div className="review-timeline-notes">{entry.notes}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="review-timeline-entry">
              <div className="review-timeline-content">
                No review history available.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewHistoryTab; 