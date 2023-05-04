import Spinner from "react-bootstrap/Spinner";

function Home() {
  return (
    <div
      style={{
        background: "url(bg.jpg) no-repeat center",
        backgroundSize: "cover",
        paddingBottom: "24px",
        position: "absolute",
        left: "0",
        top: "0",
        padding: "16px",
        paddingTop: "128px",
        height: "100svh",
        minWidth: "100vw",
        overflow: "hidden",
      }}
    >
      <div className="position-absolute top-50 start-50 translate-middle">
        <Spinner animation="border" role="status" variant="light">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    </div>
  );
}

export default Home;
