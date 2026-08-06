import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { endpoints, unwrap } from '../services/api.js';
import { resolveMediaUrl } from '../utils/media.js';

export default function ImageUploadField({ label = 'Product photo', value, onChange, required = false, folder = 'products' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const previewUrl = resolveMediaUrl(value);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, or WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be 10 MB or smaller.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const result = unwrap(await endpoints.uploadMedia(file, folder));
      onChange(result?.url || '');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="field image-upload-field">
      <span>{label}{required ? ' *' : ''}</span>
      <input ref={inputRef} type="file" accept="image/*" className="image-upload-input" onChange={handleFile} disabled={uploading} />
      <button type="button" className="image-upload-trigger" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 size={18} className="spin" /> : <ImagePlus size={18} />}
        {uploading ? 'Uploading photo...' : value ? 'Change photo' : 'Upload photo'}
      </button>
      {error ? <p className="notice">{error}</p> : null}
      {value ? (
        <div className="image-upload-preview">
          <img src={previewUrl} alt="Uploaded product" />
          <div className="image-upload-meta">
            <span className="muted">Photo uploaded successfully</span>
            <button type="button" className="btn btn-light" onClick={() => onChange('')}>Remove</button>
          </div>
        </div>
      ) : (
        <p className="muted">Upload a clear product photo. It is saved on the server under /uploads.</p>
      )}
    </div>
  );
}
