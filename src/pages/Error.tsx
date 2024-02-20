import { useRouteError } from "react-router-dom";
import Stack from "react-bootstrap/Stack";

export default function ErrorPage() {
  const error: any = useRouteError();
  console.error(error);

  return (
    <Stack
      direction="vertical"
      className="position-absolute top-50 start-50 translate-middle align-items-center text-white"
    >
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
    </Stack>
  );
}
