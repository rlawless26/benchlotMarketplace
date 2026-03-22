// src/Pages/ToolScanPage.js
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { Camera, Loader2, AlertCircle, Plus, X, ChevronDown, ChevronUp, Sparkles, Search, DollarSign, FileText } from 'lucide-react';
import ToolScanCard from '../components/ToolScanCard';
import { getAuth } from 'firebase/auth';
import { getConfig } from '../utils/environment';
import { createTool, uploadToolImage, addToToolChest, uploadToolChestImage } from '../firebase/models/toolModel';
import { useSeller } from '../firebase/hooks/useSeller';

const API_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_FIREBASE_API_URL || getConfig(
  'https://api-sed2e4p6ua-uc.a.run.app',
  'https://api-sed2e4p6ua-uc.a.run.app',
  'https://api-sed2e4p6ua-uc.a.run.app'
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

const ToolScanPage = () => {
  const { user } = useAuth();
  const { isSeller } = useSeller();
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

  // Email capture state
  const [emailCollected, setEmailCollected] = useState(false);
  const [captureEmail, setCaptureEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState(null);

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

  const handleSaveToChest = async (index, tool) => {
    // Gate on auth
    if (!user) {
      setShowAuthPrompt(true);
      throw new Error('Sign in required to save to Tool Chest');
    }

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
        toolscanData: { ...tool },
      };

      const newTool = await addToToolChest(toolData, user.uid);

      // Upload the scan image without triggering status change
      if (selectedFiles.length > 0) {
        try {
          await uploadToolChestImage(selectedFiles[0], newTool.id);
        } catch (imgError) {
          console.error('Error uploading scan image to chest tool:', imgError);
        }
      }

      return newTool.id;
    } catch (error) {
      console.error('Error saving to Tool Chest:', error);
      throw error;
    }
  };

  const handleListForSale = async (index, tool) => {
    // Gate on auth
    if (!user) {
      setShowAuthPrompt(true);
      throw new Error('Sign in required to save listings');
    }

    // Gate on seller status
    if (!isSeller) {
      throw new Error('Become a seller to list tools for sale');
    }

    // Reuse existing publish flow
    return handlePublishTool(index, tool);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const email = captureEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailSubmitting(true);
    setEmailError(null);

    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');

      await addDoc(collection(db, 'toolscan_leads'), {
        email,
        scanId: scanId || null,
        toolsIdentified: scanResults?.tools?.length || 0,
        firstToolName: scanResults?.tools?.[0]?.tool_name || null,
        source: 'toolscan_email_gate',
        created_at: serverTimestamp(),
      });

      setEmailCollected(true);
    } catch (error) {
      console.error('Email capture error:', error);
      // Don't block the user — reveal results even if save fails
      setEmailCollected(true);
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Skip email gate if user is already signed in
  const showEmailGate = scanResults && !emailCollected && !user;
  const showFullResults = scanResults && (emailCollected || user);

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
    setEmailCollected(false);
    setCaptureEmail('');
    setEmailError(null);
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
            <h3 className="text-xl font-display font-semibold text-spruce mb-2">Create an account to save your tools</h3>
            <p className="text-secondary font-body mb-6">
              Your scan results are ready. Sign up or log in to save this tool to your Tool Chest on Rekerf.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login?signup=true')}
                className="w-full py-3 px-6 bg-honey text-dark-teal rounded-lg font-medium font-body hover:bg-honey-light transition-colors"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-6 bg-spruce text-bone rounded-lg font-medium font-body hover:bg-spruce-light transition-colors"
              >
                Log In
              </button>
            </div>
            <button
              onClick={() => setShowAuthPrompt(false)}
              className="mt-4 text-sm font-body text-secondary hover:text-dark-teal transition-colors underline"
            >
              Continue reviewing
            </button>
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

        {/* Teaser + Email Gate — shown when results exist but email not collected (and not signed in) */}
        {showEmailGate && scanResults.tools.length > 0 && (
          <div>
            {/* Teaser cards */}
            <div className="space-y-4 mb-8">
              {scanResults.tools.map((tool, index) => (
                <div key={index} className="bg-bone-light rounded-xl shadow-sm border border-[#e4e2dc] p-5">
                  <div className="flex items-start gap-4">
                    {previews[0] && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-[#e4e2dc]">
                        <img src={previews[0]} alt="Scanned tool" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-display font-semibold text-spruce">{tool.tool_name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-base font-body text-secondary">
                        {tool.maker && tool.maker !== 'Unknown' && <span>{tool.maker}</span>}
                        {tool.model && <span>· {tool.model}</span>}
                        {tool.era && <span>· {tool.era}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${
                          tool.confidence === 'High' ? 'bg-green-100 text-green-800' :
                          tool.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tool.confidence} confidence
                        </span>
                      </div>
                      {/* Blurred teaser for price/details */}
                      <div className="mt-3 flex items-center gap-4 select-none">
                        <span className="text-honey font-semibold text-lg blur-sm">$XX – $XXX</span>
                        <span className="text-secondary text-sm blur-sm">Full description and listing details...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Email capture form */}
            <div className="bg-bone-light rounded-xl shadow-sm border border-[#e4e2dc] p-6 text-center">
              <Sparkles className="w-8 h-8 text-honey mx-auto mb-3" />
              <h3 className="text-xl font-display font-semibold text-spruce mb-2">
                Your tool has been identified!
              </h3>
              <p className="text-secondary font-body mb-5 max-w-md mx-auto">
                Enter your email to see the full identification, pricing estimate, and listing-ready description.
              </p>
              <form onSubmit={handleEmailSubmit} className="max-w-sm mx-auto">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={captureEmail}
                    onChange={(e) => { setCaptureEmail(e.target.value); setEmailError(null); }}
                    placeholder="you@example.com"
                    className="flex-1 px-4 py-3 bg-bone border border-[#e4e2dc] rounded-lg text-base font-body text-dark-teal focus:ring-2 focus:ring-spruce/30 focus:border-spruce transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={emailSubmitting}
                    className="px-6 py-3 bg-honey text-dark-teal rounded-lg font-medium font-body hover:bg-honey-light disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {emailSubmitting ? 'Sending...' : 'See Results'}
                  </button>
                </div>
                {emailError && (
                  <p className="text-sm text-error mt-2">{emailError}</p>
                )}
                <p className="text-xs text-secondary mt-3">We'll send you tips on listing and selling your tools. Unsubscribe anytime.</p>
              </form>
            </div>
          </div>
        )}

        {/* No tools found */}
        {scanResults && scanResults.tools.length === 0 && (
          <div className="bg-bone-light rounded-xl shadow-sm border border-stone-200 p-8 text-center">
            <p className="text-secondary">No tools were identified. Try a clearer photo with better lighting.</p>
          </div>
        )}

        {/* Full Results — shown after email collected or if user is signed in */}
        {showFullResults && scanResults.tools.length > 0 && (
          <div>
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
                  onSaveToChest={() => handleSaveToChest(index, tool)}
                  onListForSale={() => handleListForSale(index, tool)}
                  onNavigateToListing={(toolId) => navigate(`/tools/edit/${toolId}`)}
                  onCorrection={handleCorrection}
                  user={user}
                  isSeller={isSeller}
                />
              ))}
            </div>

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
