// src/Pages/ToolScanPage.js
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { Camera, Loader2, AlertCircle, Plus, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ToolScanCard from '../components/ToolScanCard';
import { getAuth } from 'firebase/auth';
import { getConfig } from '../utils/environment';
import { createTool, uploadToolImage } from '../firebase/models/toolModel';

const API_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_FIREBASE_API_URL || getConfig(
  'https://api-sed2e4p6ua-uc.a.run.app',
  'https://api-sed2e4p6ua-uc.a.run.app',
  'https://api-sed2e4p6ua-uc.a.run.app'
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

const ToolScanPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [context, setContext] = useState('');
  const [showContext, setShowContext] = useState(false);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [scanId, setScanId] = useState(null);

  // Publishing state
  const [publishingTools, setPublishingTools] = useState({});

  useEffect(() => {
    document.title = 'ToolScan | Rekerf';
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > MAX_IMAGES) {
      setScanError(`Maximum ${MAX_IMAGES} images per scan.`);
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setScanError(`${file.name} is too large. Maximum file size is 5MB.`);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setScanError(`${file.name} is not an image file.`);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setScanError(null);
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [selectedFiles.length]);

  const removeFile = useCallback((index) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, [previews]);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Strip the data URL prefix to get raw base64
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleScan = async () => {
    if (selectedFiles.length === 0) return;

    setScanning(true);
    setScanError(null);
    setScanResults(null);

    try {
      // Convert files to base64
      const images = await Promise.all(
        selectedFiles.map(async (file) => ({
          data: await fileToBase64(file),
          media_type: file.type === 'image/heic' ? 'image/heic' : file.type,
        }))
      );

      // Get auth token
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/toolscan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ images, context: context.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setScanResults(data.results);
      setScanId(data.scanId);
    } catch (error) {
      console.error('ToolScan error:', error);
      setScanError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateTool = (index, updatedTool) => {
    setScanResults(prev => ({
      ...prev,
      tools: prev.tools.map((t, i) => i === index ? updatedTool : t),
    }));
  };

  const handleDismissTool = (index) => {
    setScanResults(prev => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
    }));
  };

  const handlePublishTool = async (index, tool) => {
    setPublishingTools(prev => ({ ...prev, [index]: 'publishing' }));

    try {
      // Map ToolScan fields to the existing tool model
      const toolData = {
        name: tool.suggested_title,
        description: tool.suggested_description,
        category: tool.suggested_category,
        subcategory: tool.suggested_subcategory,
        brand: tool.maker !== 'Unknown' ? tool.maker : '',
        model: tool.model || '',
        condition: mapCondition(tool.condition),
        current_price: tool.suggested_price_low, // Start at the low end
        price_high: tool.suggested_price_high,
        era: tool.era || '',
        confidence: tool.confidence,
        collectibility: tool.collectibility,
        source: 'toolscan',
        scanId: scanId,
      };

      const newTool = await createTool(toolData, user.uid);

      // Upload the original scan image as the listing's first image
      if (selectedFiles.length > 0) {
        try {
          await uploadToolImage(selectedFiles[0], newTool.id);
        } catch (imgError) {
          console.error('Error uploading scan image to listing:', imgError);
        }
      }

      setPublishingTools(prev => ({ ...prev, [index]: 'done' }));

      return newTool.id;
    } catch (error) {
      console.error('Error publishing tool:', error);
      setPublishingTools(prev => ({ ...prev, [index]: 'error' }));
      throw error;
    }
  };

  const handleCorrection = (correction) => {
    console.log('ToolScan correction recorded:', correction);
    // TODO: persist to Firestore for accuracy tracking
  };

  const handleReset = () => {
    // Revoke all preview URLs
    previews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
    setContext('');
    setScanResults(null);
    setScanId(null);
    setScanError(null);
    setPublishingTools({});
  };

  // Map ToolScan condition grades to the existing tool model conditions
  const mapCondition = (scanCondition) => {
    const mapping = {
      'Excellent': 'Like New',
      'Good': 'Good',
      'Fair': 'Fair',
      'Project': 'Poor',
    };
    return mapping[scanCondition] || 'Good';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display font-semibold text-spruce mb-4">Sign in to use ToolScan</h2>
          <p className="text-secondary mb-6">You need an account to scan and list tools.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-honey text-dark-teal rounded-lg hover:bg-honey-light transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header — full when uploading, compact when showing results */}
        {!scanResults ? (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-honey" />
              <h1 className="text-3xl font-display font-semibold text-spruce">ToolScan</h1>
            </div>
            <p className="text-secondary text-lg">
              Snap a photo of your tools and let AI identify them, generate descriptions, and suggest prices.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-6 text-secondary font-body">
            <Sparkles className="w-5 h-5 text-honey" />
            <span className="font-semibold text-spruce">ToolScan</span>
            <span className="text-bone-dark">·</span>
            <span>{scanResults.tools.length} {scanResults.tools.length === 1 ? 'tool' : 'tools'} identified</span>
          </div>
        )}

        {/* Upload Section -- shown when no results yet */}
        {!scanResults && (
          <div className="bg-bone-light rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
            {/* Image upload area */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-dark-teal mb-3">
                Upload photos of your tools
              </label>

              {/* Preview grid */}
              {previews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {previews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200">
                      <img src={preview} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-2 right-2 p-1 bg-spruce/50 rounded-full text-bone hover:bg-spruce/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Add more button */}
                  {previews.length < MAX_IMAGES && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center cursor-pointer hover:border-honey hover:bg-honey/5 transition-colors">
                      <Plus className="w-8 h-8 text-stone-400" />
                      <span className="text-sm text-secondary mt-1">Add more</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Initial upload drop zone */}
              {previews.length === 0 && (
                <label className="block border-2 border-dashed border-stone-300 rounded-xl p-12 text-center cursor-pointer hover:border-honey hover:bg-honey/5 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-bone flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8 text-stone-400" />
                    </div>
                    <p className="text-dark-teal font-medium mb-1">
                      Drop photos here or tap to upload
                    </p>
                    <p className="text-sm text-secondary">
                      Single tool, group shot, open toolbox — ToolScan handles it all
                    </p>
                    <p className="text-xs text-stone-400 mt-2">
                      JPEG, PNG, or WebP. Up to {MAX_IMAGES} photos, 5MB each.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Optional context */}
            <div className="mb-6">
              <button
                onClick={() => setShowContext(!showContext)}
                className="flex items-center gap-2 text-sm text-secondary hover:text-spruce transition-colors"
              >
                {showContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Add context (optional)
              </button>
              {showContext && (
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder={'E.g., "These are from my grandfather\'s workshop" or "Found at an estate sale, mostly machinist tools"'}
                  className="mt-3 w-full px-4 py-3 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-honey/50 focus:border-honey resize-none"
                  rows={3}
                />
              )}
            </div>

            {/* Error display */}
            {scanError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error">{scanError}</p>
              </div>
            )}

            {/* Scan button */}
            <button
              onClick={handleScan}
              disabled={selectedFiles.length === 0 || scanning}
              className="w-full py-3 px-6 bg-honey text-dark-teal rounded-lg font-medium hover:bg-honey-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Identifying tools...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Scan {selectedFiles.length === 1 ? 'Photo' : `${selectedFiles.length} Photos`}
                </>
              )}
            </button>

            {scanning && (
              <p className="text-center text-sm text-secondary mt-3">
                This usually takes 10-20 seconds depending on the number of tools.
              </p>
            )}
          </div>
        )}

        {/* Results Section */}
        {scanResults && (
          <div>
            {/* Tool cards */}
            {scanResults.tools.length === 0 ? (
              <div className="bg-bone-light rounded-xl shadow-sm border border-stone-200 p-8 text-center">
                <p className="text-secondary">No tools were identified. Try a clearer photo with better lighting.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {scanResults.tools.map((tool, index) => (
                  <ToolScanCard
                    key={index}
                    tool={tool}
                    index={index}
                    scanId={scanId}
                    previewImage={previews[0]}
                    publishState={publishingTools[index]}
                    onUpdate={(updated) => handleUpdateTool(index, updated)}
                    onDismiss={() => handleDismissTool(index)}
                    onPublish={() => handlePublishTool(index, tool)}
                    onNavigateToListing={(toolId) => navigate(`/tools/edit/${toolId}`)}
                    onCorrection={handleCorrection}
                  />
                ))}
              </div>
            )}

            {/* Scan New Photos */}
            <div className="mt-8 text-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-spruce text-bone rounded-lg font-medium font-body hover:bg-spruce-light transition-colors"
              >
                Scan New Photos
              </button>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 p-4 bg-bone rounded-lg">
              <p className="text-sm text-secondary">
                ToolScan uses AI to identify tools and suggest prices. Identifications and price estimates are suggestions only — not appraisals. Always review and verify before publishing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolScanPage;