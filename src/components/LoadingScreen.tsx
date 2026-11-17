export function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="auth-page">
      <div className="auth-card cloud-loading" role="status" aria-live="polite">
        <span className="eyebrow">UGC AI CREATOR HUB</span>
        <p>{message}</p>
      </div>
    </main>
  )
}
