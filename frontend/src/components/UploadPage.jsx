import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shuffle from './Shuffle';
import GridScan from '../GridScan';
import './UploadPage.css';
import './Shuffle.css';

// Иконки
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconMusic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconSpinner = () => (
  <svg viewBox="0 0 24 24" className="spinner-icon">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.8s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

// Компонент превью карточки
const TrackPreviewCard = ({ title, artist, cover, duration, genre, className }) => {
  return (
    <div className={`track-preview-card ${className || ''}`}>
      <div className="track-preview-cover">
        {cover ? (
          <img src={cover} alt="Track preview" />
        ) : (
          <div className="track-preview-placeholder">
            <IconMusic />
          </div>
        )}
      </div>
      <div className="track-preview-info">
        <h4 className="track-preview-title">{title || 'New Track'}</h4>
        <p className="track-preview-artist">by {artist || 'Artist'}</p>
        <div className="track-preview-meta">
          {genre && <span className="track-preview-genre">{genre}</span>}
          {duration && <span className="track-preview-duration">{duration}</span>}
        </div>
      </div>
    </div>
  );
};

const UploadPage = ({ user, sessionToken, onUploadSuccess }) => {
  const navigate = useNavigate();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('electronic');
  const [hashtags, setHashtags] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);
  const [isDownloadable, setIsDownloadable] = useState(true);
  const [publishImmediately, setPublishImmediately] = useState(true);
  
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  
  const [dragOverAudio, setDragOverAudio] = useState(false);
  const [dragOverCover, setDragOverCover] = useState(false);
  
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);
  
  const genres = [
    { value: 'electronic', label: 'Electronic' },
    { value: 'hiphop', label: 'Hip-Hop' },
    { value: 'rock', label: 'Rock' },
    { value: 'pop', label: 'Pop' },
    { value: 'indie', label: 'Indie' },
    { value: 'metal', label: 'Metal' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'classical', label: 'Classical' },
    { value: 'other', label: 'Other' }
  ];
  
  const artistName = user?.username || user?.profile?.artist_name || user?.email?.split('@')[0] || 'Artist';
  
  const handleAudioSelect = useCallback((file) => {
    if (!file) return;
    
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select an audio file (MP3, WAV, OGG, FLAC, M4A)');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size: 50MB');
      return;
    }
    
    setAudioFile(file);
    setError('');
    
    const url = URL.createObjectURL(file);
    setAudioPreview(url);
    
    const audio = new Audio();
    audio.src = url;
    audio.onloadedmetadata = () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      setAudioDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
  }, []);
  
  const handleCoverSelect = useCallback((file) => {
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select an image (JPG, PNG, WebP, GIF)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Maximum size: 10MB');
      return;
    }
    
    setCoverFile(file);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);
  
  const handleDragOver = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'audio') setDragOverAudio(true);
    else if (type === 'cover') setDragOverCover(true);
  };
  
  const handleDragLeave = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'audio') setDragOverAudio(false);
    else if (type === 'cover') setDragOverCover(false);
  };
  
  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'audio') setDragOverAudio(false);
    else if (type === 'cover') setDragOverCover(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (type === 'audio') {
      handleAudioSelect(file);
    } else if (type === 'cover') {
      handleCoverSelect(file);
    }
  };
  
  const handleDropZoneClick = (type) => {
    if (type === 'audio') {
      audioInputRef.current?.click();
    } else if (type === 'cover') {
      coverInputRef.current?.click();
    }
  };
  
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!sessionToken) {
      setError('You must be logged in to upload tracks');
      return;
    }
    
    if (!title.trim()) {
      setError('Enter track title');
      return;
    }
    
    if (!audioFile) {
      setError('Select an audio file');
      return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artistName);
    formData.append('description', description);
    formData.append('genre', genre);
    formData.append('hashtags', hashtags);
    formData.append('is_explicit', isExplicit.toString());
    formData.append('is_downloadable', isDownloadable.toString());
    
    if (publishImmediately) {
      formData.append('status', 'published');
    } else {
      formData.append('status', 'draft');
    }
    
    formData.append('audio_file', audioFile);
    
    if (coverFile) {
      formData.append('cover', coverFile);
    }
    
    setIsUploading(true);
    setUploadStatus('uploading');
    setError('');
    
    try {
      console.log('📤 Uploading track:', { title, artist: artistName, genre });
      
      const response = await fetch('/api/tracks/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: formData
      });
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 20;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      const result = await response.json();
      clearInterval(interval);
      
      console.log('📥 Server response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || `Upload error: ${response.status}`);
      }
      
      setUploadProgress(100);
      setUploadStatus('success');
      
      if (publishImmediately && result.track?.id) {
        try {
          await fetch(`/api/tracks/${result.track.id}/waveform/generate/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ force: true })
          });
        } catch (waveformError) {
          console.warn('⚠️ Waveform generation error:', waveformError);
        }
      }
      
      setTimeout(() => {
        resetForm();
        
        if (onUploadSuccess) {
          onUploadSuccess(result.track?.id || result.track_id);
        }
        
        if (result.track?.id || result.track_id) {
          navigate(`/track/${result.track?.id || result.track_id}`);
        }
      }, 1500);
      
    } catch (error) {
      setUploadStatus('error');
      setError(error.message || 'Upload failed');
      console.error('❌ Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [
    sessionToken, title, description, genre, 
    hashtags, isExplicit, isDownloadable, publishImmediately,
    audioFile, coverFile, navigate, onUploadSuccess, artistName
  ]);
  
  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setGenre('electronic');
    setHashtags('');
    setIsExplicit(false);
    setIsDownloadable(true);
    setPublishImmediately(true);
    setAudioFile(null);
    setCoverFile(null);
    setAudioPreview(null);
    setCoverPreview(null);
    setAudioDuration(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setError('');
    
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  }, []);
  
  useEffect(() => {
    return () => {
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
      }
    };
  }, [audioPreview]);
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="upload-page">
      {/* GridScan фон */}
      <div className="upload-gridscan-background">
        <GridScan
          enableWebcam={false}
          showPreview={false}
          sensitivity={0.4}
          lineThickness={0.7}
          linesColor="#4a3b6a"
          scanColor="#a855f7"
          scanOpacity={0.3}
          gridScale={0.15}
          lineStyle="solid"
          lineJitter={0.04}
          scanDirection="pingpong"
          enablePost={true}
          bloomIntensity={0.2}
          bloomThreshold={0}
          bloomSmoothing={0}
          chromaticAberration={0.0008}
          noiseIntensity={0.003}
          scanGlow={0.35}
          scanSoftness={1.8}
          scanPhaseTaper={0.75}
          scanDuration={3.5}
          scanDelay={1.2}
          enableGyro={false}
          scanOnClick={false}
          snapBackDelay={350}
        />
      </div>
      
      <div className="upload-content">
        <div className="upload-header">
          <Shuffle
            text="UPLOAD YOUR MUSIC"
            tag="h1"
            className="upload-title shuffle-title"
            duration={0.5}
            animationMode="evenodd"
            shuffleTimes={3}
            ease="power4.out"
            stagger={0.04}
            triggerOnce={true}
            scrambleCharset="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          />
          
          <p className="upload-subtitle">
            Drop your files, add some details, and share your sound with the world
          </p>
        </div>
        
        <div className="upload-layout">
          <form className="upload-form glass" onSubmit={handleSubmit}>
            {/* Drop Zones Section */}
            <div className="upload-section files-section glass-light">
              <h3 className="section-title">
                <IconUpload />
                <span>UPLOAD FILES</span>
              </h3>
              
              <div className="drop-zones-grid">
                {/* Audio Drop Zone */}
                <div 
                  className={`drop-zone glass-light ${dragOverAudio ? 'drag-over' : ''} ${audioFile ? 'has-file' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'audio')}
                  onDragLeave={(e) => handleDragLeave(e, 'audio')}
                  onDrop={(e) => handleDrop(e, 'audio')}
                  onClick={() => handleDropZoneClick('audio')}
                >
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioSelect(e.target.files[0])}
                    disabled={isUploading}
                    hidden
                  />
                  
                  <div className="drop-zone-content">
                    <IconMusic />
                    {audioFile ? (
                      <>
                        <p className="file-name">{audioFile.name}</p>
                        <p className="file-size">{formatFileSize(audioFile.size)}</p>
                        {audioDuration && <p className="file-duration">{audioDuration}</p>}
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAudioFile(null);
                            setAudioPreview(null);
                            setAudioDuration(null);
                            if (audioInputRef.current) audioInputRef.current.value = '';
                          }}
                          disabled={isUploading}
                        >
                          <IconClose />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="drop-text">Drop audio file here</p>
                        <p className="drop-hint">or click to browse</p>
                        <p className="drop-formats">MP3, WAV, FLAC, OGG • Max 50MB</p>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Cover Drop Zone */}
                <div 
                  className={`drop-zone cover-drop-zone glass-light ${dragOverCover ? 'drag-over' : ''} ${coverFile ? 'has-file' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'cover')}
                  onDragLeave={(e) => handleDragLeave(e, 'cover')}
                  onDrop={(e) => handleDrop(e, 'cover')}
                  onClick={() => handleDropZoneClick('cover')}
                >
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleCoverSelect(e.target.files[0])}
                    disabled={isUploading}
                    hidden
                  />
                  
                  <div className="drop-zone-content">
                    <IconImage />
                    {coverFile ? (
                      <>
                        <div className="cover-preview">
                          <img src={coverPreview} alt="Cover preview" />
                        </div>
                        <p className="file-name">{coverFile.name}</p>
                        <p className="file-size">{formatFileSize(coverFile.size)}</p>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverFile(null);
                            setCoverPreview(null);
                            if (coverInputRef.current) coverInputRef.current.value = '';
                          }}
                          disabled={isUploading}
                        >
                          <IconClose />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="drop-text">Cover image (optional)</p>
                        <p className="drop-hint">or click to browse</p>
                        <p className="drop-formats">JPG, PNG, WebP • Max 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Track Details Section */}
            <div className="upload-section details-section glass-light">
              <h3 className="section-title">
                <span>TRACK DETAILS</span>
              </h3>
              
              <div className="form-group">
                <label className="upload-label" htmlFor="title">
                  TITLE
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter track title"
                  maxLength={100}
                  required
                  disabled={isUploading}
                  className="title-input"
                />
              </div>
              
              <div className="form-group">
                <label className="upload-label" htmlFor="description">
                  DESCRIPTION
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell the story behind your track..."
                  rows={2}
                  maxLength={500}
                  disabled={isUploading}
                  className="description-input"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="upload-label" htmlFor="genre">
                    GENRE
                  </label>
                  <select
                    id="genre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    disabled={isUploading}
                    className="genre-select"
                  >
                    {genres.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="upload-label" htmlFor="hashtags">
                    TAGS
                  </label>
                  <input
                    type="text"
                    id="hashtags"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#electronic #chill #2024"
                    disabled={isUploading}
                    className="tags-input"
                  />
                </div>
              </div>
              
              <div className="form-row checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isExplicit}
                    onChange={(e) => setIsExplicit(e.target.checked)}
                    disabled={isUploading}
                  />
                  <span>Explicit content</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isDownloadable}
                    onChange={(e) => setIsDownloadable(e.target.checked)}
                    disabled={isUploading}
                  />
                  <span>Allow downloads</span>
                </label>
                
                <label className="checkbox-label publish-option">
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    disabled={isUploading}
                  />
                  <span>Publish immediately</span>
                  <small className="publish-hint">
                    {publishImmediately 
                      ? 'Track will be public after upload' 
                      : 'Save as draft (private)'}
                  </small>
                </label>
              </div>
            </div>
            
            {/* Upload Progress */}
            {uploadStatus === 'uploading' && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="progress-text">
                  Uploading... {Math.round(uploadProgress)}%
                  {publishImmediately && ' • Publishing...'}
                </div>
              </div>
            )}
            
            {/* Success Message */}
            {uploadStatus === 'success' && (
              <div className="upload-success">
                <IconCheck />
                <h3>Upload Complete!</h3>
                <p>
                  {publishImmediately 
                    ? 'Your track is now live!' 
                    : 'Track saved as draft.'}
                </p>
                {publishImmediately && (
                  <p className="waveform-note">
                    Generating waveform...
                  </p>
                )}
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="upload-error">
                <IconClose />
                <p>{error}</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="upload-actions glass-light">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/')}
                disabled={isUploading}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="upload-btn"
                disabled={isUploading || !title || !audioFile}
              >
                {isUploading ? (
                  <>
                    <IconSpinner /> 
                    {publishImmediately ? 'Uploading & Publishing...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <IconUpload /> 
                    {publishImmediately ? 'Upload & Publish' : 'Save as Draft'}
                  </>
                )}
              </button>
            </div>
          </form>
          
          {/* Preview Sidebar */}
          <div className="preview-sidebar glass">
            <div className="preview-header">
              <h3>PREVIEW</h3>
              <p>This is how your track will appear</p>
            </div>
            
            <div className="preview-content">
              <TrackPreviewCard
                title={title}
                artist={artistName}
                cover={coverPreview}
                duration={audioDuration}
                genre={genres.find(g => g.value === genre)?.label}
                className="glass-light"
              />
              
              <div className="preview-info">
                <h4>Uploading as:</h4>
                <div className="user-preview">
                  <div className="user-avatar">
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt={artistName} />
                    ) : (
                      <span>{artistName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="user-info">
                    <p className="username">{artistName}</p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="preview-tips">
                <h4>Quick Tips</h4>
                <ul>
                  <li>High-quality audio (320kbps MP3)</li>
                  <li>Square cover image (1400×1400px)</li>
                  <li>Descriptive tags help discovery</li>
                  <li>You can edit details later</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;