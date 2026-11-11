import React, { useEffect, useMemo, useState } from 'react';
import {
  useDeleteGalleryMutation,
  useGetGalleryQuery,
  useUploadGalleryMutation,
} from './services/galleryApi.js';
import { useGetAdminDashboardQuery, useLogoutAdminMutation } from './services/authApi.js';

const UPLOAD_FIELD = 'images';
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_FILES = 20;

const CATEGORIES = [
  ['roads-paving', 'Roads & paving'],
  ['drainage-utilities', 'Drainage & utilities'],
  ['boundary-walls', 'Boundary walls'],
  ['gates-entrances', 'Gates & entrances'],
  ['structures-foundations', 'Structures & foundations'],
  ['finished-landscaped', 'Finished & landscaped'],
  ['on-site', 'On site'],
];

function getRequestErrorMessage(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    return 'Your admin session is not authorized. Sign out and sign in again, then retry the upload.';
  }
  if (error?.data?.message) return error.data.message;
  if (error?.status === 'PARSING_ERROR' && error.originalStatus === 413) {
    return 'The upload is too large. Each image must be 10 MB or smaller.';
  }
  if (error?.status === 'FETCH_ERROR') {
    return 'Could not reach the backend. Check that the backend is running and try again.';
  }
  return error?.error || error?.data?.error || fallback;
}

function formatDate(value) {
  if (!value) return 'Recently added';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently added'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function AdminDashboardContent() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0][0]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [deletingId, setDeletingId] = useState('');
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [notice, setNotice] = useState('');
  const [fileError, setFileError] = useState('');

  const {
    data: galleryData,
    error: galleryError,
    isFetching,
    isLoading,
    refetch,
  } = useGetGalleryQuery(categoryFilter);
  const [uploadGallery, { isLoading: uploading }] = useUploadGalleryMutation();
  const [deleteGallery] = useDeleteGalleryMutation();
  const [logoutAdmin, { isLoading: loggingOut }] = useLogoutAdminMutation();
  const photos = Array.isArray(galleryData?.photos) ? galleryData.photos : [];
  const loading = isLoading || isFetching;
  const displayedError = error || (galleryError
    ? getRequestErrorMessage(galleryError, 'Unable to load gallery photos.')
    : '');

  const categoryNames = useMemo(() => new Map(CATEGORIES), []);

  useEffect(() => {
    document.title = 'Gallery Dashboard | ZU Developers';
    document.documentElement.lang = 'en';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = '#080607';
  }, []);

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  function refreshGallery() {
    setError('');
    refetch();
  }

  async function handleLogout(event) {
    event.preventDefault();
    if (loggingOut) return;

    setError('');
    try {
      await logoutAdmin().unwrap();
      window.location.assign('/admin');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Unable to sign out.'));
    }
  }

  function addFiles(fileList) {
    const incomingFiles = Array.from(fileList || []);
    const imageFiles = incomingFiles.filter((file) => file.type.startsWith('image/'));
    const oversizedFiles = imageFiles.filter((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    const validFiles = imageFiles.filter((file) => file.size <= MAX_IMAGE_SIZE_BYTES);
    const remainingSlots = Math.max(0, MAX_UPLOAD_FILES - selectedFiles.length);
    const acceptedFiles = validFiles.slice(0, remainingSlots);
    const messages = [];

    if (incomingFiles.length > imageFiles.length) messages.push('Only image files can be added.');
    if (oversizedFiles.length) messages.push('Each image must be 10 MB or smaller.');
    if (validFiles.length > remainingSlots) messages.push('You can upload at most 20 images at a time.');
    setFileError(messages.join(' '));
    if (acceptedFiles.length) {
      setSelectedFiles((current) => [...current, ...acceptedFiles]);
      setUploadError('');
      setError('');
      setNotice('');
    }
  }

  function handleFileChange(event) {
    addFiles(event.target.files);
    event.target.value = '';
  }

  function removeSelectedFile(index) {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!selectedFiles.length) {
      setFileError('Choose at least one image to upload.');
      return;
    }

    setError('');
    setUploadError('');
    setNotice('');
    setFileError('');

    const formData = new FormData();
    formData.append('category', uploadCategory);
    selectedFiles.forEach((file) => formData.append(UPLOAD_FIELD, file));

    try {
      const payload = await uploadGallery(formData).unwrap();
      const uploaded = Number(payload.uploaded) || 0;
      const failed = Number(payload.failed) || 0;
      setNotice(`${uploaded} ${uploaded === 1 ? 'photo' : 'photos'} uploaded${failed ? `; ${failed} failed` : ''}.`);
      setSelectedFiles([]);
    } catch (requestError) {
      setUploadError(getRequestErrorMessage(requestError, 'Unable to upload the selected images.'));
    }
  }

  async function handleDelete(photo) {
    if (!window.confirm('Delete this photo from the gallery? This cannot be undone.')) return;

    setDeletingId(photo._id);
    setError('');
    setNotice('');
    try {
      const payload = await deleteGallery(photo._id).unwrap();
      setNotice(payload.message || 'Photo deleted.');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Unable to delete this photo.'));
    } finally {
      setDeletingId('');
    }
  }

  return (
    <main className="admin-dashboard">
      <aside className="admin-dashboard__sidebar" aria-label="Admin navigation">
        <a className="admin-dashboard__brand" href="/" aria-label="ZU Developers home">
          ZU<span>DEVELOPERS</span>
        </a>
        <p className="admin-dashboard__nav-label">WORKSPACE</p>
        <a className="admin-dashboard__nav-item admin-dashboard__nav-item--active" href="/admin/dashboard" aria-current="page">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
          Gallery
        </a>
        <a className="admin-dashboard__back-link" href="/">View website <span aria-hidden="true">↗</span></a>
        <a
          className="admin-dashboard__signout"
          href="/admin"
          onClick={handleLogout}
          aria-disabled={loggingOut}
        >
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </a>
      </aside>

      <div className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <span>ADMINISTRATION <span aria-hidden="true">/</span> GALLERY</span>
          <span className="admin-dashboard__status"><i aria-hidden="true" /> CONTENT MANAGER</span>
        </header>

        <div className="admin-dashboard__content">
          <div className="admin-dashboard__heading">
            <div>
              <p className="admin-dashboard__eyebrow">MEDIA LIBRARY</p>
              <h1>Gallery <em>management.</em></h1>
              <p className="admin-dashboard__description">Upload, organize and remove project photos.</p>
            </div>
            <div className="admin-dashboard__count">
              <strong>{loading ? '—' : photos.length}</strong>
              <span>{categoryFilter === 'all' ? 'PHOTOS LOADED' : 'IN THIS CATEGORY'}</span>
            </div>
          </div>

          <div className="admin-dashboard__columns">
            <section className="admin-dashboard__card admin-dashboard__upload" aria-labelledby="upload-title">
              <div className="admin-dashboard__card-heading">
                <span className="admin-dashboard__step">01</span>
                <div>
                  <h2 id="upload-title">Add photos</h2>
                  <p>Upload images to a gallery category.</p>
                </div>
              </div>

              <form onSubmit={handleUpload}>
                <label className="admin-dashboard__field-label" htmlFor="upload-category">CATEGORY</label>
                <select
                  id="upload-category"
                  value={uploadCategory}
                  onChange={(event) => setUploadCategory(event.target.value)}
                  disabled={uploading}
                >
                  {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>

                <label
                  className={`admin-dashboard__dropzone${draggingFiles ? ' is-dragging' : ''}`}
                  htmlFor="photo-files"
                  onDragOver={(event) => { event.preventDefault(); setDraggingFiles(true); }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFiles(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDraggingFiles(false);
                    addFiles(event.dataTransfer.files);
                  }}
                >
                  <span className="admin-dashboard__upload-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7 9m5-5 5 5M4 16v4h16v-4" /></svg>
                  </span>
                  <strong>Select images</strong>
                  <span>Browse your files or drop them here</span>
                  <small>Images up to 10 MB each · Up to 20 files</small>
                  <input
                    id="photo-files"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div className="admin-dashboard__selected" aria-label={`${selectedFiles.length} selected images`}>
                    {selectedFiles.map((file, index) => (
                      <div className="admin-dashboard__preview" key={`${file.name}-${file.lastModified}-${index}`}>
                        <img src={previewUrls[index]} alt="" />
                        <span title={file.name}>{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => removeSelectedFile(index)}
                          disabled={uploading}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {fileError && <p className="admin-dashboard__inline-error" role="alert">{fileError}</p>}
                {uploadError && <p className="admin-dashboard__inline-error" role="alert">{uploadError}</p>}
                {notice && <p className="admin-dashboard__notice" role="status">{notice}</p>}

                <button className="admin-dashboard__primary-button" type="submit" disabled={uploading || selectedFiles.length === 0}>
                  {uploading ? 'Uploading…' : `Upload ${selectedFiles.length || ''} ${selectedFiles.length === 1 ? 'photo' : 'photos'}`}
                  {!uploading && <span aria-hidden="true">↗</span>}
                </button>
              </form>
            </section>

            <section className="admin-dashboard__card admin-dashboard__library" aria-labelledby="library-title">
              <div className="admin-dashboard__library-heading">
                <div className="admin-dashboard__card-heading">
                  <span className="admin-dashboard__step">02</span>
                  <div>
                    <h2 id="library-title">Your gallery</h2>
                    <p>Manage photos already on your website.</p>
                  </div>
                </div>
                <button
                  className="admin-dashboard__refresh"
                  type="button"
                  onClick={refreshGallery}
                  disabled={loading}
                  aria-label="Refresh gallery"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5m-4.1-3A8 8 0 0 1 18.5 6L20 12M4 12l1.5 6A8 8 0 0 0 19.1 15" /></svg>
                </button>
              </div>

              <label className="admin-dashboard__field-label" htmlFor="gallery-category">FILTER BY CATEGORY</label>
              <select
                id="gallery-category"
                value={categoryFilter}
                onChange={(event) => {
                  setError('');
                  setCategoryFilter(event.target.value);
                }}
              >
                <option value="all">All photos</option>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>

              {displayedError && (
                <div className="admin-dashboard__alert" role="alert">
                  <span>{displayedError}</span>
                  <button type="button" onClick={refreshGallery}>Try again</button>
                </div>
              )}
              {loading ? (
                <div className="admin-dashboard__empty">Loading gallery…</div>
              ) : !displayedError && photos.length === 0 ? (
                <div className="admin-dashboard__empty">
                  <span aria-hidden="true">◇</span>
                  <strong>No photos here yet</strong>
                  <p>Upload an image to get started.</p>
                </div>
              ) : (
                <div className="admin-dashboard__photo-grid">
                  {photos.map((photo) => (
                    <article className="admin-dashboard__photo" key={photo._id}>
                      <img src={photo.url} alt="" loading="lazy" />
                      <button
                        type="button"
                        className="admin-dashboard__delete"
                        onClick={() => handleDelete(photo)}
                        disabled={deletingId === photo._id}
                        aria-label={`Delete photo from ${categoryNames.get(photo.category) || photo.category}`}
                      >
                        {deletingId === photo._id ? '…' : '×'}
                      </button>
                      <div className="admin-dashboard__photo-meta">
                        <strong>{categoryNames.get(photo.category) || photo.category}</strong>
                        <span>{formatDate(photo.createdAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <p className="admin-dashboard__footer">ZU DEVELOPERS <span>·</span> GALLERY CONTENT MANAGEMENT</p>
        </div>
      </div>
    </main>
  );
}

function AdminDashboard() {
  const { error, isError, isLoading } = useGetAdminDashboardQuery();
  const unauthorized = error?.status === 401 || error?.status === 403;

  useEffect(() => {
    if (unauthorized) window.location.replace('/admin');
  }, [unauthorized]);

  if (isLoading || unauthorized) {
    return (
      <main className="admin-dashboard">
        <div className="admin-dashboard__empty" role="status">Checking administrator access…</div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="admin-dashboard">
        <div className="admin-dashboard__empty" role="alert">
          <strong>Unable to verify administrator access.</strong>
          <p>{getRequestErrorMessage(error, 'Please check the backend connection and try again.')}</p>
          <a href="/admin">Return to sign in</a>
        </div>
      </main>
    );
  }

  return <AdminDashboardContent />;
}

export default AdminDashboard;
