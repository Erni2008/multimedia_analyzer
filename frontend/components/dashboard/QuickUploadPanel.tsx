import { DragEvent, FormEvent, useRef, useState } from "react";

import { Session } from "@/lib/auth";

import { AuthMode, BusyAction, StatusTone } from "./types";
import {
  MAX_UPLOAD_SIZE_MB,
  SUPPORTED_UPLOAD_EXTENSIONS,
  formatBytes,
  getActionSurfaceClasses,
} from "./utils";

export function QuickUploadPanel({
  authMode,
  busyAction,
  controlsDisabled,
  email,
  file,
  fileInputKey,
  isInitializing,
  onAuthModeChange,
  onAuthSubmit,
  onEmailChange,
  onFileChange,
  onFileClear,
  onPasswordChange,
  onRefresh,
  onUpload,
  password,
  session,
  statusTone,
}: {
  authMode: AuthMode;
  busyAction: BusyAction;
  controlsDisabled: boolean;
  email: string;
  file: File | null;
  fileInputKey: number;
  isInitializing: boolean;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEmailChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onFileClear: () => void;
  onPasswordChange: (value: string) => void;
  onRefresh: () => void;
  onUpload: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
  session: Session | null;
  statusTone: StatusTone;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    onFileChange(droppedFile);
  }

  return (
    <section className="section-shell relative overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(140deg,rgba(23,34,40,0.96),rgba(25,74,90,0.94),rgba(213,106,58,0.88))] p-5 text-white">
      <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),transparent_68%)]" />
      <div className="flex flex-col gap-5 xl:flex-row xl:items-stretch xl:justify-between">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/60">
            Command deck
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
            Drop media in and get signals back fast.
          </h2>
          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-white/74 sm:text-base">
            The workspace is optimized for one clear flow: authenticate, upload, watch processing, review transcript, then pull a recap when you need a shorter brief.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/78">
              Upload-first
            </span>
            <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/78">
              Auto-refresh
            </span>
            <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/78">
              Recap-ready
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            className="rounded-full border border-white/20 bg-white/12 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!session || isInitializing || controlsDisabled || busyAction === "upload"}
            onClick={onRefresh}
            type="button"
          >
            Refresh feed
          </button>
          <div className="rounded-full border border-white/20 bg-white/12 px-4 py-3 text-sm font-medium text-white/82">
            {session ? "Signed in" : "Sign in to upload"}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 xl:grid-cols-[1.28fr_0.72fr]">
        <div
          className={`rounded-[1.8rem] border border-dashed p-6 transition ${
            isDragActive
              ? "border-white bg-white/20 shadow-[0_28px_70px_-42px_rgba(255,255,255,0.38)]"
              : "border-white/24 bg-black/10"
          }`}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-white/56">
                Intake area
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                {file ? file.name : "Drag audio or video here"}
              </p>
              <p className="mt-3 max-w-lg text-sm leading-7 text-white/74">
                {file
                  ? "Looks good. This file is staged and ready to enter the analysis queue."
                  : "Supported formats: MP3, WAV, M4A, AAC, FLAC, MP4, MOV, AVI, MKV, WEBM."}
              </p>
            </div>
            <button
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[color:var(--accent-strong)] hover:bg-white/90"
              onClick={pickFile}
              type="button"
            >
              Choose file
            </button>
          </div>

          <input
            key={fileInputKey}
            accept={SUPPORTED_UPLOAD_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            ref={inputRef}
            type="file"
          />
        </div>

        <div className="grid gap-4">
          {!session ? (
            <div className="rounded-[1.55rem] border border-white/16 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-white/58">
                Account access
              </p>
              <div className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 p-1">
                <button
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    authMode === "login" ? "bg-white text-[color:var(--accent-strong)]" : "text-white/72"
                  }`}
                  onClick={() => onAuthModeChange("login")}
                  type="button"
                >
                  Sign in
                </button>
                <button
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    authMode === "register" ? "bg-white text-[color:var(--accent)]" : "text-white/72"
                  }`}
                  onClick={() => onAuthModeChange("register")}
                  type="button"
                >
                  Create account
                </button>
              </div>

              <form className="mt-4 grid gap-3" onSubmit={onAuthSubmit}>
                <input
                  autoComplete="email"
                  className="w-full rounded-[1rem] border border-white/14 bg-white/96 px-4 py-3 text-[color:var(--foreground)] outline-none focus:border-white focus:bg-white"
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="example@company.com"
                  type="email"
                  value={email}
                />
                <input
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  className="w-full rounded-[1rem] border border-white/14 bg-white/96 px-4 py-3 text-[color:var(--foreground)] outline-none focus:border-white focus:bg-white"
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Minimum 8 characters"
                  type="password"
                  value={password}
                />
                <button
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[color:var(--accent-strong)] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={controlsDisabled || isInitializing}
                  type="submit"
                >
                  {authMode === "register"
                    ? busyAction === "register"
                      ? "Creating account..."
                      : "Create account"
                    : busyAction === "login"
                      ? "Signing in..."
                      : "Sign in"}
                </button>
              </form>
              <p className="mt-4 text-sm leading-6 text-white/74">
                {authMode === "register"
                  ? "Create access, then move straight into upload."
                  : "Sign in to unlock uploads, saved watchlists, and transcript review."}
              </p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onUpload}>
              <div
                className={`rounded-[1.55rem] border p-5 backdrop-blur-sm transition-all duration-300 ${
                  busyAction === "upload"
                    ? "border-white/28 bg-white/18 shadow-[0_28px_70px_-38px_rgba(255,255,255,0.26)]"
                    : "border-white/16 bg-white/10"
                }`}
              >
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-white/58">
                  Active upload
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {file ? file.name : "No file selected"}
                </p>
                <p className="mt-3 text-sm leading-6 text-white/74">
                  {file
                    ? `${formatBytes(file.size)} • ${file.type || "Unknown type"}`
                    : `Up to ${MAX_UPLOAD_SIZE_MB} MB`}
                </p>
                <div
                  className={`mt-4 rounded-[1.1rem] border px-4 py-3 ${getActionSurfaceClasses(statusTone)}`}
                >
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    Upload state
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-[color:var(--foreground)]">
                    {busyAction === "upload"
                      ? "Upload is active. The file is being sent to the backend now."
                      : file
                        ? "File is staged and ready for submission."
                        : "Select or drop a file to arm the upload action."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    busyAction === "upload"
                      ? "bg-emerald-100 text-emerald-950 shadow-[0_20px_50px_-34px_rgba(16,185,129,0.42)]"
                      : "bg-white text-[color:var(--accent-strong)] hover:bg-white/90"
                  }`}
                  disabled={controlsDisabled || !session || isInitializing}
                  type="submit"
                >
                  {busyAction === "upload" ? "Uploading..." : "Upload now"}
                </button>
                <button
                  className="rounded-full border border-white/20 bg-white/12 px-5 py-3 text-sm font-semibold text-white hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={controlsDisabled || !file}
                  onClick={onFileClear}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
