import { Link, NavigateFunction } from "react-router-dom";
import IReviewer from "../interface/IReviewer.view";
import snakeToTitle from "../utils/functions/snakeToTitle";
import AuthService from "../services/AuthService";

export default function Navbar(
  {user, navigate} : {user: IReviewer, navigate: NavigateFunction}
) {

  return (
    <>
      <h3 style={{margin: 5}}>Welcome {user.firstName} {user.lastName}!</h3>
      <h4 style={{margin: 5}}>{snakeToTitle(user.role)}</h4>
      <Link to='/login' style={{margin: 5}} onClick={() => AuthService.logout(navigate)}>Logout</Link>
    </>
  );
}