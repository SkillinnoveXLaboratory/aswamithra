import { Redirect, Route, Switch } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import PendingPage from './pages/PendingPage.jsx';
import CustomerPortal from './pages/CustomerPortal.jsx';
import FarmerPortal from './pages/FarmerPortal.jsx';
import B2BPortal from './pages/B2BPortal.jsx';
import AdminPortal from './pages/AdminPortal.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

export default function App() {
  return (
    <Switch>
      <Route exact path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route
        path="/onboarding/:role"
        render={() => (
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/pending/:role"
        component={PendingPage}
      />
      <Route
        path="/customer"
        render={() => (
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerPortal />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/farmer"
        render={() => (
          <ProtectedRoute allowedRoles={['farmer']}>
            <FarmerPortal />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/b2b"
        render={() => (
          <ProtectedRoute allowedRoles={['b2b']}>
            <B2BPortal />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/admin"
        render={() => (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPortal />
          </ProtectedRoute>
        )}
      />
      <Route path="/home" render={() => <Redirect to="/" />} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
