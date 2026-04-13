import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="day-card skeleton-card">
      <div className="day-head">
        <div>
          <span className="today-badge skeleton-pill"></span>
          <span className="day-name skeleton-line skeleton-day"></span>
          <span className="day-date skeleton-line skeleton-date"></span>
        </div>
      </div>
      <div className="entree-block featured">
        <div className="sec-label skeleton-line skeleton-label"></div>
        <div className="skeleton-list">
          <div className="skeleton-line long"></div>
          <div className="skeleton-line medium"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
      <div className="sections-rest">
        <div className="section-block wide">
          <div className="sec-label skeleton-line skeleton-label"></div>
          <div className="skeleton-list">
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
        <div className="section-block compact">
          <div className="sec-label skeleton-line skeleton-label"></div>
          <div className="skeleton-list">
            <div className="skeleton-line short"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
        <div className="section-block compact">
          <div className="sec-label skeleton-line skeleton-label"></div>
          <div className="skeleton-list">
            <div className="skeleton-line medium"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
