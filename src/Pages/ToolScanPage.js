// src/Pages/ToolScanPage.js
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { Camera, Loader2, AlertCircle, Plus, X, ChevronDown, ChevronUp, Sparkles, Search, DollarSign, FileText } from 'lucide-react';
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
  const [started, setStarted] = useState(false); // tracks whether user has started scanning

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [scanId, setScanId] = useState(null);

  // Publishing state
  const [publishingTools, setPublishingTools] = useState({});
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    document.title = 'ToolScan — AI Tool Identification | Rekerf';
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
    setStarted(true);
  }, [selectedFiles.length]);

  const removeFile = useCallback((index) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, [previews]);

  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    // Reuse the same validation logic
    const fakeEvent = { target: { files } };
    handleFileSelect(fakeEvent);
  }, [handleFileSelect]);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
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
      const images = await Promise.all(
        selectedFiles.map(async (file) => ({
          data: await fileToBase64(file),
          media_type: file.type === 'image/heic' ? 'image/heic' : file.type,
        }))
      );

      // Include auth token if user is signed in, skip if not
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        try {
          const auth = getAuth();
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {
          // No auth — proceed without token
        }
      }

      const response = await fetch(`${API_URL}/toolscan`, {
        method: 'POST',
        headers,
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
    // Gate on auth — prompt sign in if not logged in
    if (!user) {
      setShowAuthPrompt(true);
      throw new Error('Sign in required to save listings');
    }

    setPublishingTools(prev => ({ ...prev, [index]: 'publishing' }));

    try {
      const toolData = {
        name: tool.suggested_title,
        description: tool.suggested_description,
        category: tool.suggested_category,
        subcategory: tool.suggested_subcategory,
        brand: tool.maker !== 'Unknown' ? tool.maker : '',
        model: tool.model || '',
        condition: mapCondition(tool.condition),
        current_price: tool.suggested_price_low,
        price_high: tool.suggested_price_high,
        era: tool.era || '',
        confidence: tool.confidence,
        collectibility: tool.collectibility,
        source: 'toolscan',
        scanId: scanId,
      };

      const newTool = await createTool(toolData, user.uid);

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
    previews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
    setContext('');
    setScanResults(null);
    setScanId(null);
    setScanError(null);
    setPublishingTools({});
    setShowAuthPrompt(false);
  };

  const mapCondition = (scanCondition) => {
    const mapping = {
      'Excellent': 'Like New',
      'Good': 'Good',
      'Fair': 'Fair',
      'Project': 'Poor',
    };
    return mapping[scanCondition] || 'Good';
  };

  return (
    <div className="min-h-screen bg-bone">
      {/* Auth prompt modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-teal/50">
          <div className="bg-bone-light rounded-xl shadow-lg p-8 max-w-md mx-4 text-center">
            <Sparkles className="w-10 h-10 text-honey mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-spruce mb-2">Create an account to save your listing</h3>
            <p className="text-secondary font-body mb-6">
              Your scan results are ready. Sign up or log in to save this as a draft listing on Rekerf.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-6 bg-honey text-dark-teal rounded-lg font-medium font-body hover:bg-honey-light transition-colors"
              >
                Sign Up / Log In
              </button>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="w-full py-3 px-6 border border-[#e4e2dc] rounded-lg text-secondary font-body hover:bg-bone transition-colors"
              >
                Continue Reviewing
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Landing hero — shown before user starts */}
        {!started && !scanResults && (
          <div className="text-center mb-12 pt-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-10 h-10 text-honey" />
              <h1 className="text-4xl md:text-5xl font-display font-bold text-spruce">ToolScan</h1>
            </div>
            <p className="text-xl text-secondary font-body max-w-2xl mx-auto mb-8">
              Snap a photo of any hand tool and get an instant AI-powered identification, condition assessment, and pricing estimate.
            </p>

            {/* Value props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-honey/10 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-honey" />
                </div>
                <h3 className="font-display font-semibold text-dark-teal mb-1">Instant ID</h3>
                <p className="text-sm text-secondary font-body">Identifies maker, model, era, and type from a single photo</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-honey/10 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-honey" />
                </div>
                <h3 className="font-display font-semibold text-dark-teal mb-1">Price Estimate</h3>
                <p className="text-sm text-secondary font-body">Get a market-based price range so you know what it's worth</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-honey/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-honey" />
                </div>
                <h3 className="font-display font-semibold text-dark-teal mb-1">Listing-Ready</h3>
                <p className="text-sm text-secondary font-body">Generates a title, description, and category — ready to list</p>
              </div>
            </div>

            {/* Drop zone + upload buttons */}
            <div
              className={`max-w-xl mx-auto border-2 border-dashed rounded-xl p-8 mb-4 transition-colors ${
                dragging ? 'border-honey bg-honey/10' : 'border-stone-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-honey/10 flex items-center justify-center mb-4">
                  <Camera className="w-7 h-7 text-honey" />
                </div>
                <p className="text-dark-teal font-medium font-body mb-1 hidden sm:block">
                  {dragging ? 'Drop your photo here' : 'Drag a photo here, or'}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-honey text-dark-teal rounded-lg font-medium font-body hover:bg-honey-light transition-colors cursor-pointer sm:hidden">
                    <Camera className="w-5 h-5" />
                    Take a Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-honey text-dark-teal rounded-lg font-medium font-body hover:bg-honey-light transition-colors cursor-pointer">
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Choose Photos</span>
                    <span className="sm:hidden">Upload from Library</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-secondary mt-3">JPEG, PNG, or WebP. Up to {MAX_IMAGES} photos, 5MB each.</p>
              </div>
            </div>
            <p className="text-sm text-secondary">No account required. Free to try.</p>
          </div>
        )}

        {/* Header — compact when uploading or showing results */}
        {started && !scanResults && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-honey" />
              <h1 className="text-3xl font-display font-semibold text-spruce">ToolScan</h1>
            </div>
          </div>
        )}

        {scanResults && (
          <div className="flex items-center gap-2 mb-6 text-secondary font-body">
            <Sparkles className="w-5 h-5 text-honey" />
            <span className="font-semibold text-spruce">ToolScan</span>
            <span className="text-bone-dark">·</span>
            <span>{scanResults.tools.length} {scanResults.tools.length === 1 ? 'tool' : 'tools'} identified</span>
          </div>
        )}

        {/* Upload Section — shown when user has started but no results yet */}
        {started && !scanResults && (
          <div className="bg-bone-light rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
            <div className="mb-6">
              <label className="block text-base font-medium text-dark-teal mb-3">
                Upload photos of your tools
              </label>

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

              {previews.length === 0 && (
                <label
                  className={`block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    dragging ? 'border-honey bg-honey/10' : 'border-stone-300 hover:border-honey hover:bg-honey/5'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-bone flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8 text-stone-400" />
                    </div>
                    <p className="text-dark-teal font-medium mb-1">
                      {dragging ? 'Drop photos here' : 'Drag photos here or tap to upload'}
                    </p>
                    <p className="text-sm text-secondary">
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

            {scanError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error">{scanError}</p>
              </div>
            )}

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

            <div className="mt-8 text-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-spruce text-bone rounded-lg font-medium font-body hover:bg-spruce-light transition-colors"
              >
                Scan New Photos
              </button>
            </div>

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
