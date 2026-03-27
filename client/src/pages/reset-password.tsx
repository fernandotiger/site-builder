// pages/ResetPassword.tsx
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const { token } = useParams(); // ✅ reads the token from the URL path
console.log("Params:", useParams());       // should show { token: "4YsMVmFz7aWbc5..." }
console.log("Token:", token);              // should show the token string
console.log("Full URL:", window.location.href);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await authClient.resetPassword({
      token,
      newPassword: password,
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Something went wrong");
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  if (success) {
    return (
      <div>
        <h2>Password reset successfully!</h2>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      <div className='w-full max-w-5xl mx-auto z-20 max-md:px-4 min-h-[80vh]'>
        <div className='text-center mt-16'>
            <div>
                <h3 className="text-xl font-bold">Reset Password</h3>
                <div className="my-2"><p>&nbsp;</p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><p>&nbsp;</p>
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        /><p>&nbsp;</p>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={loading || !token} className=" py-2 px-4 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-sm rounded-md transition-all">
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form></div>
    </div>
        </div>
      </div>
    </>
  );
}