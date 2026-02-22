import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Chat App</h1>
      <div className="flex flex-col gap-3">
        <Link
          href="/chat"
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium"
        >
          Chat (with @diffussion-photo / @diffussion-video)
        </Link>
        <Link
          href="/blocked"
          className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium"
        >
          Blocked contacts
        </Link>
      </div>
    </div>
  );
}
