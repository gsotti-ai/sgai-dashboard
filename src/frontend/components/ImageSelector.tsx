import React, { useRef, useState } from 'react';
import { parseImageLines } from '../utils';

export function ImageSelector({
  value,
  onChange,
  onUpload,
}: {
  value: string;
  onChange: (v: string) => void;
  onUpload: (files: FileList | null) => Promise<string[]>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const urls = parseImageLines(value);

  const mergeUrls = (incoming: string[]) => {
    const merged = Array.from(new Set([...urls, ...incoming]));
    onChange(merged.join('\n'));
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadInfo(`Upload läuft (${files.length})...`);
    try {
      const uploaded = await onUpload(files);
      mergeUrls(uploaded);
      setUploadInfo(`${uploaded.length} Bild(er) hochgeladen`);
    } catch (e: any) {
      setUploadInfo(`Upload fehlgeschlagen: ${e?.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadInfo(''), 2200);
    }
  };

  const removeAt = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    onChange(next.join('\n'));
  };

  return (
    <div className="full image-selector">
      <div
        className={`image-drop ${isDragOver ? 'drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleUpload(e.dataTransfer.files);
        }}
      >
        <div style={{ fontWeight: 600 }}>🖼️ Bilder hinzufügen</div>
        <div className="meta" style={{ marginTop: 4 }}>
          Drag & Drop hierher oder Datei auswählen
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={isUploading}>
            {isUploading ? 'Upload...' : 'Datei auswählen'}
          </button>
        </div>
        {uploadInfo ? <div className="meta" style={{ marginTop: 8 }}>{uploadInfo}</div> : null}
        <input
          ref={fileRef}
          style={{ display: 'none' }}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUpload(e.currentTarget.files)}
        />
      </div>

      <textarea
        className="full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Image URLs (eine URL pro Zeile)"
        style={{ marginTop: 10 }}
      />

      {urls.length > 0 ? (
        <div className="image-preview-grid" style={{ marginTop: 10 }}>
          {urls.map((u, i) => (
            <div key={`${u}-${i}`} className="image-preview-item">
              <a href={u} target="_blank" rel="noreferrer" className="image-preview-link" title={u}>
                <img src={u} alt={`preview-${i}`} loading="lazy" />
              </a>
              <div className="image-preview-actions">
                <span className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u}</span>
                <button type="button" className="btn-danger" onClick={() => removeAt(i)}>Entfernen</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
