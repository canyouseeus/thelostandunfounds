function App() {

  return (
    <div className="app">
      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="THE LOST+UNFOUNDS Logo" className="logo" />
        </div>
        <h1>THE LOST+UNFOUNDS</h1>
      </header>

      <main className="main">
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App

