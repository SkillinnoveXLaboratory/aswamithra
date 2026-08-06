import { Link } from 'react-router-dom';
import StateBlock from '../components/StateBlock.jsx';

export default function NotFoundPage() {
  return (
    <main className="pending-screen">
      <StateBlock
        title="Page not found"
        message="The screen you opened is not available."
        action={<Link className="btn btn-primary" to="/">Go home</Link>}
      />
    </main>
  );
}
