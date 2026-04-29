import { Helmet } from 'react-helmet-async'

export default function HelloWorld() {
  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Hello World</title>
        <meta name="description" content="Hello World test page for THE LOST+UNFOUNDS. A simple diagnostic page to ensure core routing and platform functionality are working properly." />
        <link rel="canonical" href="https://www.thelostandunfounds.com/hello-world" />
      </Helmet>
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">Hello World!</h1>
          <p className="text-xl text-gray-300">
            This page was created to test Vercel deployment.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            If you can see this, the deployment is working! 🎉
          </p>
        </div>
      </div>
    </>
  )
}
