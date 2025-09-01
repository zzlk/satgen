import { useState, useRef, useCallback } from "react";
import styles from "./FilePicker.module.css";

interface FilePickerProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove: (fileIndex: number) => void;
  onClearAll: () => void;
  selectedFiles: File[];
  previewUrls: string[];
}

export default function FilePicker({
  onFileSelect,
  onFileRemove,
  onClearAll,
  selectedFiles,
  previewUrls,
}: FilePickerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) => file.type.startsWith("image/"));
      if (validFiles.length > 0) {
        onFileSelect(validFiles);
      } else {
        alert("Please select valid image files.");
      }
    },
    [onFileSelect]
  );

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
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
      handleFileSelect(Array.from(files));
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e: React.MouseEvent, fileIndex: number) => {
    e.stopPropagation();
    onFileRemove(fileIndex);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear the file input value so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClearAll();
  };

  return (
    <div
      className={`${styles.uploadArea} ${isDragOver ? styles.dragOver : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      {selectedFiles.length === 0 ? (
        <>
          <div className={styles.uploadIcon}>📁</div>
          <h3 className={styles.uploadTitle}>Drop your images here</h3>
          <p className={styles.uploadSubtitle}>or click to browse files</p>
          <div className={styles.uploadFormats}>
            Supports: JPG, PNG, GIF, WebP (Multiple files allowed)
          </div>
        </>
      ) : (
        <div className={styles.multipleFilesContainer}>
          <div className={styles.filesHeader}>
            <h4 className={styles.filesTitle}>
              Selected Images ({selectedFiles.length})
            </h4>
            <button onClick={handleClearAll} className={styles.clearAllButton}>
              Clear All
            </button>
          </div>

          <div className={styles.filesGrid}>
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className={styles.filePreview}>
                {previewUrls[index] && (
                  <img
                    src={previewUrls[index]}
                    alt={`Preview ${index + 1}`}
                    className={styles.previewImage}
                  />
                )}
                <div className={styles.fileInfo}>
                  <p className={styles.fileName}>{file.name}</p>
                  <p className={styles.fileSize}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => handleRemoveFile(e, index)}
                  className={styles.removeButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
