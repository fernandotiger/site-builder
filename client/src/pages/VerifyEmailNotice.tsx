export default function VerifyEmailNotice() {
    return (
        <div className="max-w-md mx-auto mt-20 text-center px-4">
            <div className="text-5xl mb-6">🕊️</div>
            <h1 className="text-2xl font-bold mb-6">Please check your email inbox</h1>
            <p className="text-gray-500 mb-2">A verification link has been sent to your email. Please check your inbox and click the link to activate your account.</p>
            <p className="text-gray-400">If you don't see the email, please check your spam folder or try signing up again.</p>
             <p className="text-gray-400">The link expires in 24 hours.</p>
        </div>
    );
}