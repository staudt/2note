import { useAuth } from '../context/AuthContext';
import { NotesProvider } from '../context/NotesContext';
import { App } from './App';
import { LoginScreen } from './LoginScreen';

export function AppWrapper() {
  const { user, isLoading, isAuthEnabled, userId } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="login-screen">
        <div className="login-container">
          <h1 className="login-title">2Note</h1>
          <p className="login-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is enabled and user is not logged in, show login screen
  if (isAuthEnabled && !user) {
    return <LoginScreen />;
  }

  // User is authenticated (or auth is disabled), render the app
  return (
    <NotesProvider userId={userId}>
      <App />
    </NotesProvider>
  );
}
