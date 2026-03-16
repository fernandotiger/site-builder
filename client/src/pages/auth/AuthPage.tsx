import { useParams } from "react-router-dom"
import { AuthView } from "@daveyplate/better-auth-ui"

export default function AuthPage() {
  const { pathname } = useParams();

  if (pathname === 'sign-up') {
    alert('After you register, you will receive a confirmation email. If not, check your Spam Box.');
  }

  return (
    <main className="p-6 flex flex-col justify-center items-center h-[80vh]">
      <AuthView pathname={pathname} classNames={{base: 'bg-black/10 ring ring-indigo-900'}}/>
    </main>
  )
}