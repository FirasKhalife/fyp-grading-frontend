import { Link } from 'react-router-dom';
import './Unauthorized.css';

function Unauthorized() {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <h1>401</h1>
        <h2>Unauthorized</h2>
        <p>Sorry, you do not have permission to access this page.</p>
        <Link to="/">Go to Home</Link>
      </div>
    </div>
  );
}

export default Unauthorized;
