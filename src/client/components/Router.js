import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { HomePage } from '../views/HomePage';
import { LoginPage } from '../views/LoginPage';
import { PhotosPage } from '../views/PhotosPage';
import { UploadPage } from '../views/UploadPage';
import { SettingsPage } from '../views/SettingsPage';
import { SharePage } from '../views/SharePage';
import { useAuth } from '../contexts/AuthContext';

const routes = {
  '/': HomePage,
  '/login': LoginPage,
  '/photos': PhotosPage,
  '/upload': UploadPage,
  '/settings': SettingsPage,
  '/s/:shareId': SharePage,
};

export function Router() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { user, loading } = useAuth();

  useEffect(() => {
    // Handle browser navigation
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated
    const publicPaths = ['/', '/login', '/s/'];
    const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
    
    if (!loading && !user && !isPublicPath) {
      navigate('/login');
    }
  }, [user, loading, currentPath]);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Find matching route
  let Component = null;
  let params = {};

  for (const [path, component] of Object.entries(routes)) {
    const regex = new RegExp('^' + path.replace(/:[^/]+/g, '([^/]+)') + '$');
    const match = currentPath.match(regex);
    
    if (match) {
      Component = component;
      // Extract params
      const paramNames = (path.match(/:([^/]+)/g) || []).map(p => p.slice(1));
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
      break;
    }
  }

  if (!Component) {
    Component = () => <div class="error-page">404 - Page not found</div>;
  }

  // Make navigate available globally
  window.navigate = navigate;

  return <Component params={params} navigate={navigate} />;
}