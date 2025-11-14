export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          Elder-First Church Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Church management made simple
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary-700 min-h-touch">
            Sign In
          </button>
          <button className="bg-gray-200 text-gray-800 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-300 min-h-touch">
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}
