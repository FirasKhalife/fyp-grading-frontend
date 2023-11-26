import { ErrorResponse, useRouteError } from "react-router-dom";
import UnexpectedError from "../components/Fallback/UnexpectedError/UnexpectedError";
import LoginPage from "./LoginPage";

export default function Fallback() {

  const error = useRouteError() as ErrorResponse;

  return (
    <>
      {error.status === 401 ? (
        <LoginPage />
      ) : (
        <UnexpectedError />
      )}
    </>
  );
}