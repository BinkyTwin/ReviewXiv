"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaperUploaderProps {
  onUploadComplete?: (paperId: string) => void;
  onUploadError?: (error: string) => void;
}

export function PaperUploader({
  onUploadComplete,
  onUploadError,
}: PaperUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [arxivUrl, setArxivUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdf = acceptedFiles[0];
    if (pdf?.type === "application/pdf") {
      setFile(pdf);
      setError(null);
    } else {
      setError("Please upload a PDF file");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setProgress("Uploading PDF...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (arxivUrl) {
        formData.append("arxivUrl", arxivUrl);
      }

      const response = await fetch("/api/papers/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      setProgress("Processing PDF...");
      const data = await response.json();

      if (data.duplicate) {
        setProgress(null);
        setError("This PDF has already been uploaded");
        return;
      }

      setProgress(null);
      setFile(null);
      setArxivUrl("");
      onUploadComplete?.(data.paperId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      onUploadError?.(message);
      setProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          file && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="flex items-center justify-center gap-2 text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-medium">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-1 hover:bg-muted rounded"
              disabled={isUploading}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {isDragActive
                ? "Drop the PDF here"
                : "Drag & drop a PDF or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">PDF files only</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">
          Optional: arXiv URL
        </label>
        <Input
          placeholder="https://arxiv.org/abs/2301.00001"
          value={arxivUrl}
          onChange={(e) => setArxivUrl(e.target.value)}
          disabled={isUploading}
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {progress && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{progress}</span>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || isUploading}
        className="w-full"
        size="lg"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Paper
          </>
        )}
      </Button>
    </div>
  );
}
