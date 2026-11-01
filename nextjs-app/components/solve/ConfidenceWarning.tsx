export function ConfidenceWarning({
  imagePreviewUrl,
  message,
  onRetake,
}: {
  imagePreviewUrl: string;
  message: string;
  onRetake: () => void;
}) {
  return (
    <div className="card p-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagePreviewUrl}
        alt="Your uploaded photo"
        className="rounded-lg mx-auto mb-5 max-h-64 object-contain"
      />
      <p className="badge-warning mb-3 w-fit mx-auto">Couldn&apos;t read this clearly</p>
      <p className="font-body text-sm text-ink/70 mb-6 leading-relaxed">{message}</p>
      <button type="button" onClick={onRetake} className="btn-primary w-full">
        Retake photo
      </button>
    </div>
  );
}
