import { useParams } from "react-router-dom"
import { AuthView } from "@daveyplate/better-auth-ui"

export default function AuthPage() {
  const { pathname } = useParams();

  if (pathname === 'sign-up') {
    alert('After you register, you will receive a confirmation email. If not, check your Spam Box.');
  }

  return (
    <main className="p-6 flex flex-col justify-center items-center h-[80vh]">
      <div className="w-full max-w-[400px]">
        <AuthView pathname={pathname} classNames={{base: 'bg-black/10 ring ring-indigo-900'}}/>
        {/* Legal Consent Text */}
        <p className="mt-6 text-center text-[11px] text-gray-500 leading-relaxed px-4">
          By clicking "{pathname === 'sign-up' ? 'Sign Up' : 'Sign In'}", you agree to our{" "}
          <a 
            href="/terms" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Terms of Use
          </a>{" "}
          and acknowledge our{" "}
          <a 
            href="/privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Privacy Policy
          </a>.
        </p>
      </div>
    </main>
  )
}