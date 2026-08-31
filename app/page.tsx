"use client";

import { useState } from "react";

export default function Home() {
  const [address, setAddress] = useState("");
  const [score, setScore] = useState<number | null>(null);

  function checkScore() {
    if (!address.trim()) return;

    // Temporary activity score
    const calculatedScore = Math.min(
      100,
      Math.max(0, address.trim().length * 2)
    );

    setScore(calculatedScore);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "60px 20px",
        background: "#050505",
        color: "white",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "42px", marginBottom: "10px" }}>
        Axis Activity Score
      </h1>

      <p style={{ color: "#999", marginBottom: "35px" }}>
        Check your Axis wallet activity score
      </p>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <input
          type="text"
          placeholder="Enter wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid #333",
            background: "#111",
            color: "white",
            fontSize: "16px",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={checkScore}
          style={{
            marginTop: "15px",
            width: "100%",
            padding: "16px",
            borderRadius: "10px",
            border: "none",
            background: "#ffffff",
            color: "#000000",
            fontSize: "17px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Check Activity Score
        </button>

        {score !== null && (
          <div
            style={{
              marginTop: "30px",
              padding: "30px",
              borderRadius: "15px",
              background: "#111",
              border: "1px solid #333",
            }}
          >
            <div style={{ color: "#999" }}>Activity Score</div>

            <div
              style={{
                fontSize: "60px",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              {score}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
