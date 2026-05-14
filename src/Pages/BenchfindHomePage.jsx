import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Link as LinkIcon, Loader2, ArrowLeft } from 'lucide-react';
import { getAuth } from 'firebase/auth';

import Button from '../components/benchfind/Button';
import ScanResultCard from '../components/benchfind/ScanResultCard';
import { getConfig } from '../utils/environment';
import { track } from '../utils/analytics';
import { useAuth } from '../firebase/hooks/useAuth';

const API_URL = process.env.REACT_APP_API_URL
  || process.env.REACT_APP_FIREBASE_API_URL
  || getConfig(
    'https://api-sed2e4p6ua-uc.a.run.app',
    'https://api-sed2e4p6ua-uc.a.run.app',
    'https://api-sed2e4p6ua-uc.a.run.app',
  );

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Benchfind landing + scan page.
 *
 * Single-page state machine: idle (hero + drop-zone) → scanning (loading)
 * → result (new ScanResultCard rendered inline).
 *
 * Photo flow: drops the file → POSTs /toolscan → renders result inline.
 * Follow-up photo on Medium/Low-confidence results escalates via the
 * `next_photo_hint` upgrade affordance (POST /toolscan with
 * previous_scan_id; result replaces in place).
 *
 * URL flow: navigates to /check/{hash} via existing /url-check (the
 * existing CheckPage already snapshots the result as a share permalink).
 *
 * Share permalinks for photo flow are deferred — currently the in-page
 * result has no shareable URL. The Share button copies the page URL as a
 * placeholder until a dedicated /r/{scanId} route lands.
 */
const BenchfindHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [followupInProgress, setFollowupInProgress] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Result state
  const [scanResults, setScanResults] = useState(null); // { tool, general_notes? }
  const [scanId, setScanId] = useState(null);
  const [imagePaths, setImagePaths] = useState([]);
  const [previewImage, setPreviewImage] = useState(null); // local object URL

  useEffect(() => {
    document.title = 'Benchfind — Check it before you buy';
    return () => {
      if (previewImage) URL.revokeObjectURL(previewImage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callToolscan = useCallback(async (file, previousScanId) => {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    let mediaType = file.type || 'image/jpeg';
    if (base64.startsWith('UklGR')) mediaType = 'image/webp';
    else if (base64.startsWith('/9j/')) mediaType = 'image/jpeg';
    else if (base64.startsWith('iVBOR')) mediaType = 'image/png';
    if (file.type === 'image/heic') mediaType = 'image/heic';

    const headers = { 'Content-Type': 'application/json' };
    if (user) {
      try {
        const auth = getAuth();
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (e) { /* proceed unauthenticated */ }
    }
    const body = { images: [{ data: base64, media_type: mediaType }] };
    if (previousScanId) body.previous_scan_id = previousScanId;

    const resp = await fetch(`${API_URL}/toolscan`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Scan failed.');
    return data;
  }, [user]);

  const submitPhoto = useCallback(async (file) => {
    if (!file || submitting) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('Photo is too large (max 5 MB). Try a smaller image.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError("That doesn't look like an image. Try a JPG, PNG, or WebP.");
      return;
    }
    setSubmitting(true);
    setError(null);
    track('benchfind_scan_started', { input_type: 'photo', is_authed: Boolean(user) });
    const previewUrl = URL.createObjectURL(file);
    if (previewImage) URL.revokeObjectURL(previewImage);
    setPreviewImage(previewUrl);
    try {
      const data = await callToolscan(file);
      setScanResults(data.results);
      setScanId(data.scanId || null);
      setImagePaths(Array.isArray(data.imagePaths) ? data.imagePaths : []);
      track('benchfind_scan_completed', {
        canonical_brand: data.results?.tool?.canonical_brand || null,
        canonical_type: data.results?.tool?.canonical_type || null,
        canonical_model: data.results?.tool?.canonical_model || null,
        plane_type_number: Number.isInteger(data.results?.tool?.plane_type_number)
          ? data.results.tool.plane_type_number : null,
        confidence: data.results?.tool?.confidence || null,
      });
      // Scroll to top so the user lands on the new result card cleanly.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Benchfind scan error:', err);
      setError(err.message || 'Something went wrong. Try again?');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, user, callToolscan, previewImage]);

  // Follow-up photo to escalate a Medium/Low confidence ID. POSTs with
  // previous_scan_id so the server prepends prior identification as
  // context and links the new scan to the previous via previousScanId.
  const handleFollowupPhoto = useCallback(async (file) => {
    if (!file || followupInProgress || !scanId) return;
    setFollowupInProgress(true);
    setError(null);
    const previousConfidence = scanResults?.tool?.confidence || null;
    track('benchfind_next_photo_hint_followed', {
      previous_scan_id: scanId,
      previous_confidence: previousConfidence,
      hint: scanResults?.tool?.next_photo_hint || null,
    });
    const startedAt = Date.now();
    try {
      const data = await callToolscan(file, scanId);
      setScanResults(data.results);
      setScanId(data.scanId || null);
      setImagePaths(Array.isArray(data.imagePaths) ? data.imagePaths : []);
      // Replace preview so the result card shows the refining shot.
      const previewUrl = URL.createObjectURL(file);
      if (previewImage) URL.revokeObjectURL(previewImage);
      setPreviewImage(previewUrl);
      track('benchfind_confidence_escalation', {
        from: previousConfidence,
        to: data.results?.tool?.confidence || null,
        duration_ms: Date.now() - startedAt,
      });
    } catch (err) {
      console.error('Benchfind follow-up error:', err);
      setError(err.message || 'Refinement failed.');
    } finally {
      setFollowupInProgress(false);
    }
  }, [followupInProgress, scanId, scanResults, callToolscan, previewImage]);

  // Correction flow handler. Writes scan_feedback (denormalized imagePaths
  // for ML access). Mirrors the schema used by ToolScanPage's correction
  // flow + Phase 3 corrections-promotion cron.
  const handleFeedback = useCallback(async (feedback) => {
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      await addDoc(collection(db, 'scan_feedback'), {
        vote: feedback.vote,
        scanId: feedback.scanId || scanId || null,
        imagePaths: feedback.imagePaths || imagePaths || [],
        email: null,
        originalResult: feedback.originalResult,
        correctedResult: feedback.correctedResult || null,
        userEdits: feedback.userEdits || null,
        hasEdits: !!feedback.userEdits,
        host: 'benchfind',
        created_at: serverTimestamp(),
      });
    } catch (err) {
      console.error('Benchfind feedback save error:', err);
    }
  }, [scanId, imagePaths]);

  const submitUrl = useCallback(async (e) => {
    if (e) e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    track('benchfind_scan_started', { input_type: 'url', is_authed: Boolean(user) });
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        try {
          const auth = getAuth();
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (e) { /* proceed unauthenticated */ }
      }
      const resp = await fetch(`${API_URL}/url-check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "We couldn't read that URL.");
      navigate(`/check/${data.hash}`);
    } catch (err) {
      console.error('Benchfind URL check error:', err);
      setError(err.message || 'Something went wrong.');
      setSubmitting(false);
    }
  }, [urlInput, submitting, user, navigate]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
    if (files[0]) submitPhoto(files[0]);
  }, [submitPhoto]);

  const handleReset = () => {
    if (previewImage) URL.revokeObjectURL(previewImage);
    setScanResults(null);
    setScanId(null);
    setImagePaths([]);
    setPreviewImage(null);
    setError(null);
    setUrlInput('');
  };

  // ───────────────────────────────────────────────────────────────────────
  // Result state — render new Benchfind ScanResultCard inline.
  // ───────────────────────────────────────────────────────────────────────
  if (scanResults && scanResults.tool) {
    return (
      <div className="bg-paper-50 min-h-screen">
        <main className="px-6 py-6 lg:py-9">
          <div className="max-w-[880px] mx-auto">
            <div className="flex items-center gap-2 mb-4 font-sans text-xs text-ink-500">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer text-ink-600 hover:text-ink-900"
              >
                <ArrowLeft size={14} strokeWidth={1.75} />
                Back
              </button>
              <span>·</span>
              <span className="font-mono">Scanned just now</span>
            </div>

            <ScanResultCard
              tool={scanResults.tool}
              scanId={scanId}
              imagePaths={imagePaths}
              previewImage={previewImage}
              onFollowupPhoto={handleFollowupPhoto}
              followupInProgress={followupInProgress}
              onFeedback={handleFeedback}
            />

            <div className="mt-6 text-center">
              <Button variant="secondary" onClick={handleReset}>
                Scan another tool
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Idle state — hero + DropZone + "What you get back" cards.
  // ───────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-paper-50 min-h-screen">
      {/* Hero */}
      <section className="px-8 pt-16 pb-8 lg:pt-[72px] lg:pb-8 bg-paper-50">
        <div className="max-w-[980px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          {/* Left column: copy */}
          <div>
            <span className="inline-flex items-center gap-2 font-sans text-[11px] font-semibold text-forest-700 uppercase tracking-[0.08em]">
              <span className="w-[6px] h-[6px] bg-forest-700 rounded-full" />
              Plane-first today
            </span>
            <h1
              className="mt-[14px] font-display font-medium text-ink-900 leading-[1.0] tracking-tightest"
              style={{ fontSize: 'clamp(44px, 7vw, 64px)' }}
            >
              Check it before<br />you <em className="text-forest-700 italic">buy</em>.
            </h1>
            <p className="mt-5 font-sans text-[17px] leading-[1.6] text-ink-600 max-w-[440px]">
              Identification, condition, comp prices, and a fair-price verdict for used hand planes. Phone-ready in dim shops and flea markets.
            </p>
            <div className="flex gap-[18px] mt-7 font-sans text-[12px] text-ink-500">
              <span><strong className="text-ink-800 font-mono">160+</strong> Stanley type variants indexed</span>
              <span><strong className="text-ink-800 font-mono">90 days</strong> rolling comp window</span>
            </div>
          </div>

          {/* Right column: DropZone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-xl transition-all duration-DEFAULT ease-standard ${
              dragging
                ? 'bg-forest-50 shadow-md ring-[1.5px] ring-forest-700'
                : 'bg-white shadow-sm ring-[1.5px] ring-[#C9BC9E] ring-dashed'
            }`}
            style={{ padding: '40px 36px' }}
          >
            <div className="flex flex-col items-center gap-[14px]">
              {/* Inline B mark */}
              <div
                className="w-14 h-14 rounded-lg bg-ink-900 text-paper-50 flex items-center justify-center font-display font-bold"
                style={{
                  fontSize: 32,
                  letterSpacing: '-0.02em',
                  boxShadow: 'inset 0 0 0 2px #1F4D3A',
                }}
              >B</div>
              <h2 className="m-0 font-display font-medium text-[26px] sm:text-[34px] text-ink-900 text-center leading-[1.15] tracking-tightest">
                Snap a photo or paste a URL.
              </h2>
              <p className="m-0 font-sans text-[14px] text-ink-600 text-center max-w-[420px]">
                Get identification, condition, comps, and a verdict. Usually in 8 seconds.
              </p>

              <div className="flex gap-[10px] mt-2 flex-wrap justify-center">
                <Button
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 size={17} strokeWidth={1.75} className="animate-spin" />
                  ) : (
                    <Camera size={17} strokeWidth={1.75} />
                  )}
                  Use camera
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Upload size={17} strokeWidth={1.75} />
                  Upload photo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                capture="environment"
                disabled={submitting}
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) submitPhoto(f);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />

              <div className="flex items-center gap-3 w-full max-w-[460px] mt-2">
                <div className="flex-1 h-px bg-paper-200" />
                <span className="font-sans text-[11px] text-ink-500 uppercase tracking-[0.08em]">or paste a URL</span>
                <div className="flex-1 h-px bg-paper-200" />
              </div>

              <form onSubmit={submitUrl} className="flex gap-2 w-full max-w-[460px]">
                <div className="flex-1 flex items-center gap-2 bg-white border border-[#C9BC9E] rounded-md px-3 min-h-[44px] focus-within:border-forest-700 focus-within:ring-[3px] focus-within:ring-forest-700/20 transition-all duration-fast">
                  <LinkIcon size={18} strokeWidth={1.75} className="text-ink-500" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setError(null); }}
                    placeholder="ebay.com/itm/..."
                    disabled={submitting}
                    className="flex-1 bg-transparent border-0 outline-none font-sans text-[15px] text-ink-900 py-3"
                  />
                </div>
                <Button type="submit" disabled={submitting || !urlInput.trim()}>
                  Check it
                </Button>
              </form>

              <span className="font-sans text-[11px] text-ink-500 mt-1">
                Currently supports eBay listings.
              </span>

              {error && (
                <div className="w-full max-w-[460px] mt-2 px-3 py-2 bg-[#F7DDD6] text-[#B0321F] font-sans text-[13px] rounded-md">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* "What you get back" — three explanatory tiles */}
      <section className="px-8 py-10 bg-paper-50">
        <div className="max-w-[980px] mx-auto">
          <span className="font-sans text-[11px] font-semibold text-ink-500 uppercase tracking-[0.08em]">
            What you get back
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-[18px]">
            {[
              { n: '01', t: 'What is this?', d: 'Maker, model, era, type-study notes — with sources.' },
              { n: '02', t: "What’s it worth?", d: 'A 90-day comp band from indexed dealer + forum + eBay listings.' },
              { n: '03', t: 'Is this fair?', d: 'A single-line verdict. Not a vibe — a number against a band.' },
            ].map((x) => (
              <div
                key={x.n}
                className="bg-white rounded-lg px-[22px] py-5"
                style={{ boxShadow: 'inset 0 0 0 1px #DDD2B9' }}
              >
                <span className="font-mono text-xs text-forest-700">{x.n}</span>
                <h3 className="mt-2 mb-[6px] font-display text-[22px] font-medium text-ink-900 tracking-tight">{x.t}</h3>
                <p className="m-0 font-sans text-[14px] text-ink-600 leading-[1.5]">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BenchfindHomePage;
