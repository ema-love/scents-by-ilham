"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-NG">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#faf6f0", color: "#231d26" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 500 }}>Something went wrong.</h1>
            <p style={{ color: "#62596a" }}>Please check your connection and try again.</p>
            <button onClick={() => reset()} style={{ marginTop: 16, height: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#2b2130", color: "#fbf7f1", fontSize: 16 }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
