import Map from "./components/Map";

import "./App.scss";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";

function App() {
  return (
    <Container fluid>
      <Row className="bg-dark border-bottom" style={{ height: "80px" }}></Row>
      <Row>
        <Map></Map>
      </Row>
    </Container>
  );
}

export default App;
