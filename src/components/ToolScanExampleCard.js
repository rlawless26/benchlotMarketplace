// src/components/ToolScanExampleCard.js
import React from 'react';

const ToolScanExampleCard = () => {
  return (
    <div className="bg-bone-light rounded-xl shadow-sm border border-[#e4e2dc]">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border border-[#e4e2dc]">
            <img src="/images/toolscan-example-stanley-no5.jpg" alt="Stanley No. 5 Jack Plane" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-display font-semibold text-spruce">
              Stanley No. 5 Jack Plane — Type 11, c. 1910–1918
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-base font-body text-secondary">
              <span><strong className="text-dark-teal">Maker:</strong> Stanley</span>
              <span><strong className="text-dark-teal">Model:</strong> No. 5</span>
              <span><strong className="text-dark-teal">Era:</strong> 1910–1918</span>
              <span className="text-honey font-semibold">$75 – $110</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body bg-green-100 text-green-800">High confidence</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body bg-blue-100 text-blue-800">Good</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body bg-purple-100 text-purple-800">Moderate collectibility</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review fields */}
      <div className="px-5 pb-5 border-t border-[#e4e2dc] pt-4">
        <h4 className="text-base font-display font-semibold text-spruce uppercase tracking-wide mb-1">
          Review Identification
        </h4>
        <p className="text-sm font-body text-secondary mb-4">
          Verify the details below. Edit any field that doesn't look right, then confirm.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Tool Type</label>
            <div className="px-3 py-2 bg-bone border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal">Jack Plane</div>
          </div>
          <div>
            <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Maker</label>
            <div className="px-3 py-2 bg-bone border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal">Stanley</div>
          </div>
          <div>
            <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Model</label>
            <div className="px-3 py-2 bg-bone border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal">No. 5</div>
          </div>
          <div>
            <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Condition</label>
            <div className="px-3 py-2 bg-bone border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal">Good</div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium font-body text-secondary uppercase tracking-wide mb-1">Description</label>
            <div className="px-3 py-2 bg-bone border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal">
              A solid user-grade Stanley No. 5 with a Type 11 frog and original rosewood tote. The iron has plenty of life left and the sole is flat. Some patina on the sides adds character without affecting function.
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="border-t border-[#e4e2dc]">
        <div className="px-5 py-3">
          <span className="text-base font-semibold font-body text-dark-teal">AI Analysis</span>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <div>
            <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Era Reasoning</label>
            <p className="text-base font-body text-secondary mt-0.5">Type 11 identified by the "STANLEY" lateral lever marking, kidney-shaped lever cap hole, and rosewood handles with close grain pattern. Patent dates behind the frog consistent with 1910–1918 production.</p>
          </div>
          <div>
            <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Condition Notes</label>
            <p className="text-base font-body text-secondary mt-0.5">Tote has a minor chip at the top but is solid. Knob is original with light wear. Iron has been sharpened but retains good length. Japanning is 60% intact. Frog mates well to the bed.</p>
          </div>
          <div>
            <label className="text-sm font-medium font-body text-secondary uppercase tracking-wide">Collectibility</label>
            <p className="text-base font-body text-secondary mt-0.5">Type 11 is a desirable Sweetheart-era plane. Good user value with modest collector interest due to the era and original parts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolScanExampleCard;
