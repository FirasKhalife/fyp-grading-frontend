import UnexpectedError from "../components/Fallback/UnexpectedError/UnexpectedError";
import AuthService from "../services/AuthService";
import LoginPage from "./LoginPage";

export default function Fallback() {

  return (
    <>
      {AuthService.getCurrentUser() ? (
        <UnexpectedError />
      ) : (
        <LoginPage />
      )}
    </>
  );
}