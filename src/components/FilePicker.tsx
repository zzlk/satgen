import { useState, useRef, useCallback } from "react";

interface FilePickerProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  previewUrl: string | null;
}

export default function FilePicker({
  onFileSelect,
  onFileRemove,
  selectedFile,
  previewUrl,
}: FilePickerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file && file.type.startsWith("image/")) {
        onFileSelect(file);
      } else {
        alert("Please select a valid image file.");
      }
    },
    [onFileSelect]
  );

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear the file input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileRemove();
  };

  return (
    <div
      className={`upload-area ${isDragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      {!selectedFile ? (
        <>
          <div className="upload-icon">📁</div>
          <h3 className="upload-title">Drop your image here</h3>
          <p className="upload-subtitle">or click to browse files</p>
          <div className="upload-formats">Supports: JPG, PNG, GIF, WebP</div>
        </>
      ) : (
        <div className="preview-container">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="preview-image" />
          )}
          <div className="file-info">
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-size">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button onClick={handleRemoveFile} className="remove-button">
            Remove File
          </button>
        </div>
      )}
    </div>
  );
}
