"use client";

import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_SIZE_LABEL,
} from "@/lib/pdf/constants";

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

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const rejection = fileRejections[0];
      if (rejection) {
        const hasSizeError = rejection.errors.some(
          (err) => err.code === "file-too-large",
        );
        setError(
          hasSizeError
            ? `File too large. Max size is ${MAX_PDF_SIZE_LABEL}.`
            : "Please upload a PDF file",
        );
        setFile(null);
        return;
      }

      const pdf = acceptedFiles[0];
      if (!pdf) return;

      if (pdf.size > MAX_PDF_SIZE_BYTES) {
        setError(`File too large. Max size is ${MAX_PDF_SIZE_LABEL}.`);
        setFile(null);
        return;
      }

      if (pdf.type === "application/pdf") {
        setFile(pdf);
        setError(null);
      } else {
        setError("Please upload a PDF file");
        setFile(null);
      }
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_PDF_SIZE_BYTES,
    maxFiles: 1,
    multiple: false,
  });

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    if (file.size > MAX_PDF_SIZE_BYTES) {
      setError(`File too large. Max size is ${MAX_PDF_SIZE_LABEL}.`);
      return;
    }

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
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border/50 hover:border-primary/30 hover:bg-muted/30",
          file && "border-primary/50 bg-primary/5 shadow-inner",
          isUploading && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="flex flex-col items-center gap-4 animate-in">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center apple-shadow">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-sm truncate max-w-[200px]">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
              Fichier prêt à l'import
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto apple-shadow group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {isDragActive
                  ? "Déposez le PDF ici"
                  : "Glissez-déposez un PDF"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Ou cliquez pour parcourir vos fichiers
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 px-1">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
          Lien arXiv (Optionnel)
        </label>
        <Input
          placeholder="https://arxiv.org/abs/..."
          value={arxivUrl}
          onChange={(e) => setArxivUrl(e.target.value)}
          disabled={isUploading}
          className="rounded-2xl h-12 bg-muted/50 border-border/50 focus-visible:ring-primary/20"
        />
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in">
          <p className="text-destructive text-xs font-medium">{error}</p>
        </div>
      )}

      {progress && (
        <div className="flex flex-col items-center gap-3 animate-in">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">{progress}</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress-glow w-1/2" />
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || isUploading}
        className="w-full rounded-full py-7 h-auto font-bold text-lg apple-shadow bg-primary text-primary-foreground hover:scale-[1.01] transition-all"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-3" />
            Analyse en cours...
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 mr-3" />
            Importer le Document
          </>
        )}
      </Button>
    </div>
  );
}
