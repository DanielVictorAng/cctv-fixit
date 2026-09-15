import { redirect } from 'next/navigation'

// The proxy sends every visitor to /login or their role home before this renders.
export default function Home() {
  redirect('/login')
}
