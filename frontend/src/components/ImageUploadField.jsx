import { useEffect, useRef, useState } from 'react';
import { FileUp, ImagePlus, Loader2 } from 'lucide-react';
import { endpoints, unwrap } from '../services/api.js';
import { resolveMediaUrl } from '../utils/media.js';

export default function ImageUploadField({
  label = 'Product photo',
  value,
  onChange,
  required = false,
  folder = 'products',
  accept = 'image',
  helpText,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localPreview, setLocalPreview] = useState('');
  const [brokenRemote, setBrokenRemote] = useState(false);
  const isDocumentMode = accept === 'document';
  const isPdf = typeof value === 'string' && /\.pdf($|\?)/i.test(value);
  const remotePreview = resolveMediaUrl(value);
  const previewUrl = localPreview || remotePreview;

  useEffect(() => {
    setBrokenRemote(false);
  }, [value]);

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const clearLocalPreview = () => {
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedImage = file.type.startsWith('image/');
    const allowedPdf = file.type === 'application/pdf';
    if (isDocumentMode) {
      if (!allowedImage && !allowedPdf) {
        setError('Please choose an image (JPG/PNG/WEBP) or PDF file.');
        return;
      }
    } else if (!allowedImage) {
      setError('Please choose an image file (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size <= 0) {
      setError('Selected file is empty. Please choose another photo.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be 10 MB or smaller.');
      return;
    }

    clearLocalPreview();
    if (allowedImage) {
      setLocalPreview(URL.createObjectURL(file));
    }

    setUploading(true);
    setError('');
    setBrokenRemote(false);
    try {
      const result = unwrap(await endpoints.uploadMedia(file, folder));
      const uploadedUrl = result?.url || '';
      if (!uploadedUrl || (typeof result?.sizeBytes === 'number' && result.sizeBytes <= 0)) {
        throw new Error('Upload returned an empty file. Please try again.');
      }
      onChange(uploadedUrl);
    } catch (err) {
      clearLocalPreview();
      onChange('');
      setError(err?.response?.data?.error?.message || err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const triggerLabel = uploading
    ? 'Uploading...'
    : value
      ? isDocumentMode
        ? 'Change document'
        : 'Change photo'
      : isDocumentMode
        ? 'Upload document'
        : 'Upload photo';

  return (
    <div className="field image-upload-field">
      <span>{label}{required ? ' *' : ''}</span>
      <input
        ref={inputRef}
        type="file"
        accept={isDocumentMode ? 'image/*,application/pdf' : 'image/*'}
        className="image-upload-input"
        onChange={handleFile}
        disabled={uploading}
      />
      <button type="button" className="image-upload-trigger" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 size={18} className="spin" /> : isDocumentMode ? <FileUp size={18} /> : <ImagePlus size={18} />}
        {triggerLabel}
      </button>
      {error ? <p className="notice">{error}</p> : null}
      {value || localPreview ? (
        <div className="image-upload-preview">
          {isPdf && !localPreview ? (
            <a className="document-upload-link" href={previewUrl} target="_blank" rel="noreferrer">
              View uploaded PDF
            </a>
          ) : (
            <img
              src={previewUrl}
              alt={isDocumentMode ? 'Uploaded document preview' : 'Uploaded product preview'}
              onError={() => {
                if (!localPreview) setBrokenRemote(true);
              }}
            />
          )}
          <div className="image-upload-meta">
            <span className="muted">
              {brokenRemote
                ? 'Photo saved, but preview could not load. Try re-uploading.'
                : isDocumentMode
                  ? 'Document uploaded successfully'
                  : 'Photo uploaded successfully'}
            </span>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                clearLocalPreview();
                setBrokenRemote(false);
                onChange('');
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">
          {helpText ||
            (isDocumentMode
              ? 'Upload a clear Aadhaar photo or PDF.'
              : 'Upload a clear product photo.')}
        </p>
      )}
    </div>
  );
}
