import React from "react";
import { Card, Button, Container } from "react-bootstrap";

function MemberCard(props) {
  return (
    <Container>
      <Card>
        <Card.Header>{props.role}</Card.Header>
        <Card.Img variant="top" src={props.img} />
        <Card.Body>
          <Card.Title>{props.name}</Card.Title>
          <Card.Text>{props.intro}</Card.Text>
          <Button variant="primary" href={props.p_link}>Know More</Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default MemberCard;
