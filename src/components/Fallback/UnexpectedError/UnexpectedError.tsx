import { Link } from 'react-router-dom';
import './UnexpectedError.css';

function UnexpectedError() {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <h1>Uh, oh...</h1>
        <h2>Unexpected Error</h2>
        <p>It's not you it's us... please try again later</p>
        <Link to="/">Go to Home</Link>
      </div>
    </div>
  );
}

export default UnexpectedError;
