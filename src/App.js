import Map from "./components/Map";
import "./App.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
function App() {
  return (
    <Container fluid>
      <Row>
        <Col className="px-0">
          <Map></Map>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
