import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";

function PredictBtn() {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <form method="POST" action="/predict/{{$date->time->arrical}}">
        <Button variant="primary" onClick={handleShow}>
          Predict travel time
        </Button>
      </form>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Loading</Modal.Title>
        </Modal.Header>
        <Modal.Body>Finding the best route for you.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PredictBtn;
